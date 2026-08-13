import type { AdvertisingEntity } from "./types";
export function canonicalProductKey(entity: AdvertisingEntity) { const market=(entity.marketplace ?? "unknown").trim().toLowerCase(); const id=(entity.asin ?? entity.sku).trim().toUpperCase(); if (!id) throw new Error("ASIN or SKU is required."); return `${market}:${id}`; }
export function assertSameOrganization(left: {organizationId:string}, right: {organizationId:string}) { if (left.organizationId !== right.organizationId) throw new Error("Cross-organization entity resolution is forbidden."); }
