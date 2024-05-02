import { Client } from '@notionhq/client';
import { NextPage, GetStaticProps } from 'next';
import styles from '../styles/Home.module.css';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export type Content = {
  type: 
      | 'paragraph'
      | 'quote'
      | 'heading_2'
      | 'heading_3'
  text: string | null;
}
| {
  type: 'code',
  text: string | null,
  language: string | null;
};

export type Post = {
  id: string;
  title: string | null;
  slug: string | null;
  createdTs: string | null;
  lastEditedTs: string | null;
  contents: Content[];
}

type StaticProps = {
  post: Post | null;
}

  export const getStaticProps: GetStaticProps<StaticProps> = async () => {
    const database = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID || '',
      filter: {
      and: [
        {
          property: 'published',
          checkbox: {
            equals: true
          }
        }
      ]
    },
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'descending'
      }
    ]
  });

  // console.dir(database, { depth: null });
  const page = database.results[0];
  if(!page || !('properties' in page)) {
    return {
      props: {
        post: null
      }
    };
  }
  
  const createdTs = 'created_time' in page ? page.created_time : null;
  const lastEditedTs = 'last_edited_time' in page ? page.last_edited_time : null;

  let title: string | null = null;
  if (page.properties['name'] && page.properties['name'].type === 'title' && Array.isArray(page.properties['name'].title)){
    title = page.properties['name'].title[0]?.plain_text ?? null;
  }
  let slug: string | null = null;
  if (page.properties['slug'] && page.properties['slug'].type === 'multi_select' && Array.isArray(page.properties['slug'].multi_select)) {
    slug = page.properties['slug'].multi_select[0]?.name ?? null;
  }

  const blocks = await notion.blocks.children.list({
    block_id: page.id
  });

  const contents: Content[] = [];
  blocks.results.forEach((block) => {
    if (!('type' in block)) {
      return;
    }
    switch (block.type) {
      case 'paragraph':
        contents.push({
          type: 'paragraph',
          text: block.paragraph.rich_text[0]?.plain_text ?? null
        });
        break;
        case 'heading_2':
          contents.push({
            type: 'heading_2',
            text: block.heading_2.rich_text[0]?.plain_text ?? null
          });
        break;
        case 'heading_3':
          contents.push({
            type: 'heading_3',
            text: block.heading_3.rich_text[0]?.plain_text ?? null,
          });
        break;
        case 'quote':
          contents.push({
            type: 'quote',
            text: block.quote.rich_text[0]?.plain_text ?? null,
          });
        break;
        case 'code':
          contents.push({
            type: 'code',
            text: block.code.rich_text[0]?.plain_text ?? null,
          language: block.code.language
        });
    }
  });

  const post: Post = {
    id: page.id,
    title,
    slug,
    createdTs, 
    lastEditedTs,
    contents
  };

  // console.dir(post, { depth: null});

  return {
    props: {
       post 
    }
  };
}

const Home: NextPage<StaticProps> = ({ post }) => {
   if(!post) {
    return null;
   } 

   return (
    <div className={styles.wrapper}>
      <div className={styles.post}>
        <h1 className={styles.title}>{post.title}</h1>
      </div>
    </div>
   );
};

export default Home;