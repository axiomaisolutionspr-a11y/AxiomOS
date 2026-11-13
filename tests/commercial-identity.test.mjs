import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commercialIdentityAuthConfig, commercialIdentityDatabase, commercialIdentityEnabled, commercialMember, commercialOfferWriterDatabase } from "../app/lib/commercial-identity.ts";

test("identity pilot fails closed outside QA and without dedicated endpoints", () => {
  const env={VERCEL_ENV:"preview",AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED:"true",
    AXIOMOS_IDENTITY_QA_DATABASE_URL:"postgresql://axiomos_offers_qa_reader:qa@ep-identity.example/axiomos_offers_qa",
    AXIOMOS_IDENTITY_QA_DATABASE_HOST:"ep-identity.example",
    NEON_AUTH_BASE_URL:"https://ep-identity.neonauth.example/axiomos_offers_qa/auth",
    AXIOMOS_IDENTITY_QA_AUTH_HOST:"ep-identity.neonauth.example",
    NEON_AUTH_COOKIE_SECRET:"a-synthetic-qa-cookie-secret-longer-than-32-characters",
    AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL:"postgresql://axiomos_autopilot_qa_offer_writer:synthetic@ep-identity.example/axiomos_offers_qa"};
  assert.ok(commercialIdentityEnabled(env));
  assert.ok(commercialIdentityDatabase(env));
  assert.ok(commercialIdentityAuthConfig(env));
  assert.ok(commercialOfferWriterDatabase(env));
  assert.equal(commercialIdentityAuthConfig(env).cookies.sessionDataTtl,5);
  assert.equal(commercialIdentityAuthConfig({...env,VERCEL_ENV:"production"}),null);
  const prod={VERCEL_ENV:"production",AXIOMOS_COMMERCIAL_ENABLED:"true",
    AXIOMOS_COMMERCIAL_DATABASE_URL:"postgresql://axiomos_commercial_reader:synthetic@ep-prod-pooler.example/neondb",
    AXIOMOS_COMMERCIAL_WRITER_URL:"postgresql://axiomos_commercial_writer:synthetic@ep-prod.example/neondb",
    AXIOMOS_COMMERCIAL_DATABASE_HOST:"ep-prod.example",
    AXIOMOS_COMMERCIAL_AUTH_BASE_URL:"https://ep-prod.neonauth.example/neondb/auth",
    AXIOMOS_COMMERCIAL_AUTH_HOST:"ep-prod.neonauth.example",
    AXIOMOS_COMMERCIAL_COOKIE_SECRET:"synthetic-secret-must-be-longer-than-32-characters"};
  assert.ok(commercialIdentityDatabase(prod));
  assert.ok(commercialOfferWriterDatabase(prod));
  assert.ok(commercialIdentityAuthConfig(prod));
  // Parallel production connections are used only with the explicit switch.
  const prodLive = { ...prod,
    DATABASE_URL:"postgresql://neondb_owner:synthetic@ep-live.example/neondb",
    AXIOMOS_COMMERCIAL_LIVE_DATABASE_HOST:"ep-live-pooler.example",
    AXIOMOS_COMMERCIAL_LIVE_DATABASE_URL:"postgresql://axiomos_commercial_reader:synthetic@ep-live-pooler.example/neondb",
    AXIOMOS_COMMERCIAL_LIVE_WRITER_URL:"postgresql://axiomos_commercial_writer:synthetic@ep-live.example/neondb",
  };
  assert.ok(commercialIdentityDatabase(prodLive), "switch off keeps original live URLs untouched");
  assert.ok(commercialOfferWriterDatabase(prodLive), "switch off keeps original writer untouched");
  const enabledLive = { ...prodLive, AXIOMOS_COMMERCIAL_LIVE_DATABASE_ENABLED:"true" };
  assert.ok(commercialIdentityDatabase(enabledLive), "reader connects to the live branch");
  assert.ok(commercialOfferWriterDatabase(enabledLive), "writer connects to the live branch");
  assert.ok(commercialIdentityAuthConfig(enabledLive), "Neon Auth credentials stay unchanged");
  assert.equal(commercialIdentityDatabase({ ...enabledLive, AXIOMOS_COMMERCIAL_LIVE_DATABASE_URL:undefined }), null,
    "missing parallel reader fails closed");
  assert.equal(commercialOfferWriterDatabase({ ...enabledLive, AXIOMOS_COMMERCIAL_LIVE_WRITER_URL:undefined }), null,
    "missing parallel writer fails closed");
  assert.equal(commercialIdentityDatabase({ ...enabledLive, AXIOMOS_COMMERCIAL_LIVE_DATABASE_HOST:"ep-other.example" }),null,
    "mismatched host fails closed");
  assert.equal(commercialIdentityDatabase({ ...enabledLive, VERCEL_ENV:"preview" }),null,
    "production switch never changes preview routing");
  assert.equal(commercialIdentityDatabase({...prod,AXIOMOS_COMMERCIAL_ENABLED:"false"}),null);
  assert.equal(commercialOfferWriterDatabase({...prod,AXIOMOS_COMMERCIAL_WRITER_URL:"postgresql://owner:synthetic@ep-prod.example/neondb"}),null);
  assert.equal(commercialIdentityAuthConfig({...prod,AXIOMOS_COMMERCIAL_AUTH_HOST:"wrong.example"}),null);
  assert.equal(commercialOfferWriterDatabase({...env,VERCEL_ENV:"production"}),null);
  assert.equal(commercialOfferWriterDatabase({...env,AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL:"postgresql://owner:password@ep-identity.example/axiomos_offers_qa"}),null);
  assert.equal(commercialOfferWriterDatabase({...env,AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL:"postgresql://axiomos_autopilot_qa_offer_writer:password@ep-production.example/axiomos_offers_qa"}),null);
  assert.equal(commercialIdentityDatabase({...env,DATABASE_URL:"postgresql://legacy@ep-identity.example/neondb"}),null);
  assert.equal(commercialIdentityDatabase({...env,AXIOMOS_IDENTITY_QA_DATABASE_HOST:"another.example"}),null);
  assert.equal(commercialIdentityAuthConfig({...env,AXIOMOS_IDENTITY_QA_AUTH_HOST:"other.example"}),null);
  assert.equal(commercialIdentityAuthConfig({...env,NEON_AUTH_COOKIE_SECRET:"too-short"}),null);
});

test("database permission excludes absent and disabled users", async () => {
  const dataDir=await mkdtemp(join(tmpdir(),"axiomos-identity-qa-"));
  const initial=await PGlite.create({dataDir});
  await initial.exec("CREATE DATABASE neondb");
  await initial.close();
  const db=await PGlite.create({dataDir,database:"neondb"});
  try {
    const migration=await readFile(new URL("../database/migrations/20261108_axiomos_identity_v1.sql",import.meta.url),"utf8");
    await db.exec(migration);
    await db.exec(migration);
    const sql=async(parts,...values)=> (await db.query(parts.reduce((s,p,i)=>s+(i?`$${i}`:"")+p,""),values)).rows;
    const id="00000000-0000-4000-8000-00000000a001";
    assert.equal(await commercialMember(sql,id),null);
    await db.query("INSERT INTO axiomos_identity.memberships (tenant_id,user_id,role) VALUES ('axiomai',$1::uuid,'owner')",[id]);
    assert.equal((await commercialMember(sql,id)).role,"owner");
    await db.query("UPDATE axiomos_identity.memberships SET status='disabled' WHERE user_id=$1::uuid",[id]);
    assert.equal(await commercialMember(sql,id),null);
    assert.equal(await commercialMember(sql,"invalid"),null);
  } finally { await db.close();await rm(dataDir,{recursive:true,force:true}); }
});
