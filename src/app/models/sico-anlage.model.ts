export interface SicoAnlage {
  id: number;
  projectName: string;
  releaseDate: string;
  neuronId: string;
  password: string;
  modemPassword: string;
  isModemPassword: boolean;
  hasLicense: boolean;
  password3: string;
  isPassword3: boolean;
  password4: string;
  isPassword4: boolean;
  password5: string;
  isPassword5: boolean;
  description: string;
  userName: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  expiresAt: string;
  isAdmin: boolean;
  canManageLicenses: boolean;
}

export interface LicenseRequest {
  neuronId: string;
  projectName: string;
  description: string;
  version: string;
  userName: string;
  isPremium: boolean;
  hasLicence: boolean;
}

export interface LicenseResponse {
  password: string;
  premiumPassword: string;
  modemPassword: string;
  premiumModemPassword: string;
  serverName: string;
  info: string;
  isNewLicense: boolean;
}

export interface DeleteRequest {
  neuronId: string;
  userName: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export type ProductType = 'sico1010' | 'sico2020' | 'sico5000' | 'sico6000';
