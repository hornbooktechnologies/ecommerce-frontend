import StoreHeader from '@/features/storefront/components/store-header';
import ComparisonBoard from '@/features/storefront/components/comparison-board';
export const metadata={title:'Compare products | Hornbook Retail',robots:{index:false,follow:true}};
export default async function ComparePage({searchParams}){const query=await searchParams;return <><StoreHeader/><ComparisonBoard key={typeof query.items==='string'?query.items:''} selection={typeof query.items==='string'?query.items:''}/></>;}
