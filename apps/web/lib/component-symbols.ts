import metadata from "../.source/component-symbols.json";

export interface RegistrySymbols {
  registryItem: string;
  exports: string[];
}

interface ComponentSymbolCatalog {
  [name: string]: RegistrySymbols;
}

export const componentSymbols: ComponentSymbolCatalog = metadata;
