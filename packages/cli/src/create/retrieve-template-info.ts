import { manifest } from "pacote";
import getNpmAuthToken from "registry-auth-token";
import getNpmRegistry from "registry-auth-token/registry-url";
import { DependencyMap } from "../types/coat-manifest";

interface TemplateInfo {
  name: string;
  version: string;
  peerDependencies: DependencyMap | undefined;
}

export async function retrieveTemplateInfo(
  template: string
): Promise<TemplateInfo> {
  try {
    const npmRegistry = getNpmRegistry();
    const npmAuthToken = getNpmAuthToken(npmRegistry);

    const templateInfo = await manifest(template, {
      token: npmAuthToken?.token,
      registry: npmRegistry,
    });
    return {
      name: templateInfo.name,
      version: templateInfo.version,
      peerDependencies: templateInfo.peerDependencies,
    };
  } catch (error) {
    if (error.statusCode === 404) {
      throw new Error(
        `Could not find ${template} on npm. Please ensure that the template name is correct and it is published to the npm registry`
      );
    }
    throw error;
  }
}
