import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { getPosts, getPostContents } from "../index";
import { Post } from "../index";

type StaticProps = {
  post?: Post;
}

type StaticPathsParams = {
  slug: string;
};

export const getStaticPaths: GetStaticPaths<StaticPathsParams> = async () => {
   const posts: Post[] = await getPosts();
   const paths: {
    params: { slug: string };
   }[] = [];
   posts.forEach((post: Post) => {
    const slug = post.slug;
    if(slug) {
      paths.push({
        params: {
          slug
        }
      });
    }
   });
   return { paths, fallback: 'blocking'};
}

export const getStaticProps: GetStaticProps<StaticProps, StaticPathsParams> = async ({
  params,
  preview 
}) => {
  const notFoundProps = {
    props: {},
    redirect: {
      destination: '/404',
    }
  };
  if(!params) {
    return notFoundProps;
  } 

  const { slug } = params;
  const posts = await getPosts(slug);
  const post = posts.shift();
  if (!post) {
    return notFoundProps;
  }
  const contents = await getPostContents(post);
  post.contents = contents;
  return {
    props: {
      post
    }
  };
};

const PostPage: NextPage<StaticProps> = ({ post }) => {
  if (!post) return null;
  return <div>{JSON.stringify(post)}</div>
}

export default PostPage;
