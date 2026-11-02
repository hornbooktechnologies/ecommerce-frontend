import MyProductQuestions from '@/features/storefront/components/my-product-questions';
export const metadata={title:'My product questions | Hornbook Retail',robots:{index:false,follow:false}};
export default async function QuestionsPage({searchParams}){const query=await searchParams;const questionId=typeof query.question==='string'&&/^[a-f0-9-]{36}$/i.test(query.question)?query.question:undefined;return <MyProductQuestions key={questionId||'all'} questionId={questionId}/>;}
