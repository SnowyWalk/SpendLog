import "server-only";
import {
  EasyCodef,
  EasyCodefConstant,
} from "easycodef-node";

export function parseCodefResponse<T>(rawResponse: string | T): T {
  return typeof rawResponse === "string"
    ? (JSON.parse(rawResponse) as T)
    : rawResponse;
}

function resolveCodefServiceType() {
  const serviceType = process.env.CODEF_SERVICE_TYPE || "DEMO";
  if (serviceType === "API") {
    return EasyCodefConstant.SERVICE_TYPE_API;
  }
  if (serviceType === "SANDBOX") {
    return EasyCodefConstant.SERVICE_TYPE_SANDBOX;
  }
  if (serviceType === "DEMO") {
    return EasyCodefConstant.SERVICE_TYPE_DEMO;
  }
  throw new Error("CODEF_SERVICE_TYPE must be DEMO, API, or SANDBOX");
}

export function getCodefServiceTypeName() {
  const serviceType = process.env.CODEF_SERVICE_TYPE || "DEMO";
  if (serviceType === "DEMO" || serviceType === "API" || serviceType === "SANDBOX") {
    return serviceType;
  }
  throw new Error("CODEF_SERVICE_TYPE must be DEMO, API, or SANDBOX");
}

export const CODEF_SERVICE_TYPE = resolveCodefServiceType();

export function createCodefClient() {
  const {
    CODEF_DEMO_CLIENT_ID,
    CODEF_DEMO_CLIENT_SECRET,
    CODEF_CLIENT_ID,
    CODEF_CLIENT_SECRET,
    CODEF_PUBLIC_KEY,
  } = process.env;

  if (!CODEF_PUBLIC_KEY) {
    throw new Error("CODEF_PUBLIC_KEY is required");
  }

  const codef = new EasyCodef();
  codef.setPublicKey(CODEF_PUBLIC_KEY);

  if (CODEF_SERVICE_TYPE === EasyCodefConstant.SERVICE_TYPE_API) {
    if (!CODEF_CLIENT_ID || !CODEF_CLIENT_SECRET) {
      throw new Error("CODEF_CLIENT_ID / CODEF_CLIENT_SECRET is required for API service type");
    }
    codef.setClientInfo(CODEF_CLIENT_ID, CODEF_CLIENT_SECRET);
  } else if (CODEF_SERVICE_TYPE === EasyCodefConstant.SERVICE_TYPE_DEMO) {
    if (!CODEF_DEMO_CLIENT_ID || !CODEF_DEMO_CLIENT_SECRET) {
      throw new Error("CODEF_DEMO_CLIENT_ID / CODEF_DEMO_CLIENT_SECRET is required for DEMO service type");
    }
    codef.setClientInfoForDemo(CODEF_DEMO_CLIENT_ID, CODEF_DEMO_CLIENT_SECRET);
  }

  return codef;
}
