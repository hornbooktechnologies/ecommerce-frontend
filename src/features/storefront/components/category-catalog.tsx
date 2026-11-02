import CatalogExplorer from './catalog-explorer';

export default function CategoryCatalog({ category }: { category: string }) {
  return <CatalogExplorer category={category} />;
}
