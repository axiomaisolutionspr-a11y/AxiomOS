import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qaIdentityAuthConfig, qaIdentityDatabase, qaIdentityEnabled, qaMember, qaOfferWriterDatabase } from "../app/lib/qa-identity.ts";

test("identity pilot fails closed outside QA and without dedicated endpoints", () => {
  const env={VERCEL_ENV:"preview",AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED:"true",
    AXIOMOS_IDENTITY_QA_DATABASE_URL:"postgresql://qa:qa@ep-identity.example/axiomos_offers_qa",
    AXIOMOS_IDENTITY_QA_DATABASE_HOST:"ep-identity.example",
    NEON_AUTH_BASE_URL:"https://ep-identity.neonauth.example/axiomos_offers_qa/auth",
    AXIOMOS_IDENTITY_QA_AUTH_HOST:"ep-identity.neonauth.example",
    NEON_AUTH_COOKIE_SECRET:"a-synthetic-qa-cookie-secret-longer-than-32-characters",
    AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL:"postgresql://axiomos_autopilot_qa_offer_writer:synthetic@ep-identity.example/axiomos_offers_qa"};
  assert.ok(qaIdentityEnabled(env));
  assert.ok(qaIdentityDatabase(env));
  assert.ok(qaIdentityAuthConfig(env));
  assert.ok(qaOfferWriterDatabase(env));
  assert.equal(qaIdentityAuthConfig(env).cookies.sessionDataTtl,5);
  assert.equal(qaIdentityAuthConfig({...env,VERCEL_ENV:"production"}),null);
  assert.equal(qaOfferWriterDatabase({...env,VERCEL_ENV:"production"}),null);
  assert.equal(qaOfferWriterDatabase({...env,AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL:"postgresql://owner:password@ep-identity.example/axiomos_offers_qa"}),null);
  assert.equal(qaOfferWriterDatabase({...env,AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL:"postgresql://axiomos_autopilot_qa_offer_writer:password@ep-production.example/axiomos_offers_qa"}),null);
  assert.equal(qaIdentityDatabase({...env,DATABASE_URL:"postgresql://legacy@ep-identity.example/neondb"}),null);
  assert.equal(qaIdentityDatabase({...env,AXIOMOS_IDENTITY_QA_DATABASE_HOST:"another.example"}),null);
  assert.equal(qaIdentityAuthConfig({...env,AXIOMOS_IDENTITY_QA_AUTH_HOST:"other.example"}),null);
  assert.equal(qaIdentityAuthConfig({...env,NEON_AUTH_COOKIE_SECRET:"too-short"}),null);
});

test("database permission excludes absent and disabled users", async () => {
  const dataDir=await mkdtemp(join(tmpdir(),"axiomos-identity-qa-"));
  const initial=await PGlite.create({dataDir});
  await initial.exec("CREATE DATABASE axiomos_offers_qa");
  await initial.close();
  const db=await PGlite.create({dataDir,database:"axiomos_offers_qa"});
  try {
    const migration=await readFile(new URL("../database/migrations/20261107_axiomos_identity_qa.sql",import.meta.url),"utf8");
    await db.exec(migration);
    await db.exec(migration);
    const sql=async(parts,...values)=> (await db.query(parts.reduce((s,p,i)=>s+(i?`$${i}`:"")+p,""),values)).rows;
    const id="00000000-0000-4000-8000-00000000a001";
    assert.equal(await qaMember(sql,id),null);
    await db.query("INSERT INTO axiomos_identity.memberships (tenant_id,user_id,role) VALUES ('axiomai',$1::uuid,'owner')",[id]);
    assert.equal((await qaMember(sql,id)).role,"owner");
    await db.query("UPDATE axiomos_identity.memberships SET status='disabled' WHERE user_id=$1::uuid",[id]);
    assert.equal(await qaMember(sql,id),null);
    assert.equal(await qaMember(sql,"invalid"),null);
  } finally { await db.close();await rm(dataDir,{recursive:true,force:true}); }
});
