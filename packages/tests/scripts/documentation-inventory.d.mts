export interface DocumentationPage {
  name: string;
  title: string;
  route: string;
  registryItem: string;
  playground: boolean;
}

export function documentationInventory(root?: string): {
  pages: DocumentationPage[];
  playgrounds: DocumentationPage[];
  items: string[];
};
