import PostCard from '@/components/PostCard'
import type { WPPost, WPMedia } from '@/lib/api'

type Props = {
  posts: WPPost[]
  mediaMap?: Record<number, WPMedia>
}

export default function PostList({ posts, mediaMap = {} }: Props) {
  return (
    <>
      <div className="post-grid">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} media={mediaMap[post.featured_media] ?? null} />
        ))}
      </div>
      <style>{`
        .post-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3px;
        }
        @media (min-width: 600px) {
          .post-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1024px) {
          .post-grid { grid-template-columns: 1fr 1fr 1fr; }
        }
      `}</style>
    </>
  )
}
