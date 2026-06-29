"use strict";

const crypto = require("node:crypto");
const constants = require("node:constants");

const OAUTH_DOMAIN = "https://oauth.codef.io";
const API_DOMAIN = "https://api.codef.io";
const DEMO_DOMAIN = "https://development.codef.io";
const SANDBOX_DOMAIN = "https://sandbox.codef.io";

const EasyCodefConstant = {
  SERVICE_TYPE_API: 0,
  SERVICE_TYPE_DEMO: 1,
  SERVICE_TYPE_SANDBOX: 2,
};

const ACCOUNT_URLS = {
  getConnectedIdList: "/v1/account/connectedId-list",
  getAccountList: "/v1/account/list",
  createAccount: "/v1/account/create",
  addAccount: "/v1/account/add",
  updateAccount: "/v1/account/update",
  deleteAccount: "/v1/account/delete",
};

function productDomain(serviceType) {
  if (serviceType === EasyCodefConstant.SERVICE_TYPE_API) {
    return API_DOMAIN;
  }
  if (serviceType === EasyCodefConstant.SERVICE_TYPE_DEMO) {
    return DEMO_DOMAIN;
  }
  return SANDBOX_DOMAIN;
}

function decodeBody(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function encryptRSA(publicKey, plainText) {
  return crypto
    .publicEncrypt(
      {
        key: `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
        padding: constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(plainText)
    )
    .toString("base64");
}

class EasyCodef {
  constructor() {
    this.clientID = "";
    this.clientSecret = "";
    this.demoClientID = "";
    this.demoClientSecret = "";
    this.publicKey = "";
    this.tokens = new Map();
  }

  setPublicKey(publicKey) {
    this.publicKey = publicKey;
  }

  setClientInfo(clientID, clientSecret) {
    this.clientID = clientID;
    this.clientSecret = clientSecret;
  }

  setClientInfoForDemo(clientID, clientSecret) {
    this.demoClientID = clientID;
    this.demoClientSecret = clientSecret;
  }

  getClientInfo(serviceType) {
    if (serviceType === EasyCodefConstant.SERVICE_TYPE_API) {
      return { clientID: this.clientID, clientSecret: this.clientSecret };
    }
    if (serviceType === EasyCodefConstant.SERVICE_TYPE_DEMO) {
      return { clientID: this.demoClientID, clientSecret: this.demoClientSecret };
    }
    return {
      clientID: process.env.CODEF_SANDBOX_CLIENT_ID || "",
      clientSecret: process.env.CODEF_SANDBOX_CLIENT_SECRET || "",
    };
  }

  async requestToken(serviceType) {
    const { clientID, clientSecret } = this.getClientInfo(serviceType);
    if (!clientID || !clientSecret) {
      throw new Error("CODEF client id/secret is required");
    }

    const response = await fetch(`${OAUTH_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientID}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials&scope=read",
    });

    if (!response.ok) {
      throw new Error(`CODEF token request failed: HTTP ${response.status}`);
    }

    const body = await response.json();
    if (!body.access_token) {
      throw new Error("CODEF token response did not include access_token");
    }
    return body.access_token;
  }

  async getAccessToken(serviceType) {
    const cached = this.tokens.get(serviceType);
    if (cached) {
      return cached;
    }
    const token = await this.requestToken(serviceType);
    this.tokens.set(serviceType, token);
    return token;
  }

  async requestProduct(productURL, serviceType, param) {
    const token = await this.getAccessToken(serviceType);
    const response = await fetch(`${productDomain(serviceType)}${productURL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: encodeURIComponent(JSON.stringify(param)),
    });

    const text = decodeBody(await response.text());
    if (response.status === 401 && text.includes("invalid_token")) {
      this.tokens.delete(serviceType);
      return this.requestProduct(productURL, serviceType, param);
    }
    if (!response.ok) {
      throw new Error(`CODEF product request failed: HTTP ${response.status} ${text}`);
    }
    return text;
  }

  createAccount(serviceType, param) {
    return this.requestProduct(ACCOUNT_URLS.createAccount, serviceType, param);
  }

  getConnectedIdList(serviceType, param) {
    return this.requestProduct(ACCOUNT_URLS.getConnectedIdList, serviceType, param);
  }

  getAccountList(serviceType, param) {
    return this.requestProduct(ACCOUNT_URLS.getAccountList, serviceType, param);
  }

  addAccount(serviceType, param) {
    return this.requestProduct(ACCOUNT_URLS.addAccount, serviceType, param);
  }

  updateAccount(serviceType, param) {
    return this.requestProduct(ACCOUNT_URLS.updateAccount, serviceType, param);
  }

  deleteAccount(serviceType, param) {
    return this.requestProduct(ACCOUNT_URLS.deleteAccount, serviceType, param);
  }
}

module.exports = {
  EasyCodef,
  EasyCodefConstant,
  EasyCodefUtil: { encryptRSA },
};
