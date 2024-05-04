import { Client } from '@notionhq/client';
import { NextPage, GetStaticProps } from 'next';
import styles from '../styles/Home.module.css';
import dayjs from 'dayjs';
import prism from 'prismjs';
import { useEffect } from 'react';

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
  posts: Post[];
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
  const posts: Post[] = [];
  const blockResponse = await Promise.all(
    database.results.map((page) => {
      return notion.blocks.children.list({
        block_id: page.id
      });
    })
  );
  // const page = database.results[0];
  database.results.forEach((page, index) => {
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
  
  const blocks = blockResponse[index];
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

  posts.push({
    id: page.id,
    title,
    slug,
    createdTs,
    lastEditedTs,
    contents
  })

  

  // console.dir(post, { depth: null});
  });
  return {
    props: {
       posts 
    }
  };

}



const Home: NextPage<StaticProps> = ({ posts }) => {

  if (!posts) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      {posts.map((post) => {
        return (
          <div className={styles.post} key={post.id}>
            <h1 className={styles.title}>{post.title}</h1>
            <div className={styles.timestampWrapper}>
              <div>
                <div className={styles.timestamp}>
                  作成日時:{' '}
                  {dayjs(post.createdTs).format('YYYY/MM/DD HH:mm:ss')}
                </div>
                <div className={styles.timestamp}>
                  更新日時:{' '}
                  {dayjs(post.lastEditedTs).format('YYYY/MM/DD HH:mm:ss')}
                </div>
              </div>
            </div>
            <div>
              {post.contents.map((content, index) => {
                const key = `${post.id}-${index}`;
                switch (content.type) {
                  case 'heading_2':
                    return (
                      <h2 key={key} className={styles.heading2}>
                        {content.text}
                      </h2>
                    );
                  case 'heading_3':
                    return (
                      <h3 key={key} className={styles.heading3}>
                        {content.text}
                      </h3>
                    );
                  case 'paragraph':
                    return (
                      <p key={key} className={styles.paragraph}>
                        {content.text}
                      </p>
                    );
                  case 'code':
                    return (
                      <pre className={`${styles.code} lang-${content.language}`}>
                        <code>{content.text}</code>
                      </pre>
                    );
                  case 'quote':
                    return (
                      <blockquote key={key} className={styles.quote}>
                        {content.text}
                      </blockquote>
                    );
                  default:
                    return <div key={key}>Unknown content type</div>;
                }
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default Home;