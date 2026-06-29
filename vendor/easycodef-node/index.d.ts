export type ServiceType = 0 | 1 | 2;

export declare const EasyCodefConstant: {
  SERVICE_TYPE_API: 0;
  SERVICE_TYPE_DEMO: 1;
  SERVICE_TYPE_SANDBOX: 2;
};

export declare const EasyCodefUtil: {
  encryptRSA(publicKey: string, plainText: string): string;
};

export declare class EasyCodef {
  setPublicKey(publicKey: string): void;
  setClientInfo(clientID: string, clientSecret: string): void;
  setClientInfoForDemo(clientID: string, clientSecret: string): void;
  requestToken(serviceType: ServiceType): Promise<string>;
  requestProduct(productURL: string, serviceType: ServiceType, param: unknown): Promise<string>;
  createAccount(serviceType: ServiceType, param: unknown): Promise<string>;
  getConnectedIdList(serviceType: ServiceType, param: unknown): Promise<string>;
  getAccountList(serviceType: ServiceType, param: unknown): Promise<string>;
  addAccount(serviceType: ServiceType, param: unknown): Promise<string>;
  updateAccount(serviceType: ServiceType, param: unknown): Promise<string>;
  deleteAccount(serviceType: ServiceType, param: unknown): Promise<string>;
}
