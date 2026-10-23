'use client';
import { FormEvent, useState } from 'react';
import { Check, MessageCircle, Send, Star } from 'lucide-react';

type Review = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
};
const STORAGE_KEY = 'aura-site-reviews-v1';
const initialReviews: Review[] = [
  {
    id: 'seed-1',
    name: 'Riya K.',
    rating: 5,
    title: 'It feels like a real destination',
    body: 'I came for headphones and stayed to explore home and beauty. Everything feels carefully chosen.',
  },
  {
    id: 'seed-2',
    name: 'Dev A.',
    rating: 5,
    title: 'Finally, shopping that feels fresh',
    body: 'The category pages are clear, the details are useful, and the monthly edit made discovering products fun.',
  },
  {
    id: 'seed-3',
    name: 'Ananya P.',
    rating: 5,
    title: 'Beautiful and surprisingly easy',
    body: 'It looks premium without making anything difficult. I found, compared and saved my favourites in minutes.',
  },
];

function readReviews() {
  if (typeof window === 'undefined') return initialReviews;
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]',
    ) as Review[];
    return [...saved, ...initialReviews];
  } catch {
    return initialReviews;
  }
}

export default function ReviewWall() {
  const [reviews, setReviews] = useState<Review[]>(readReviews);
  const [rating, setRating] = useState(5);
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const review: Review = {
      id: `review-${Date.now()}`,
      name: String(data.get('name')).trim(),
      rating,
      title: String(data.get('title')).trim(),
      body: String(data.get('body')).trim(),
    };
    const personal = [
      review,
      ...reviews.filter((item) => !item.id.startsWith('seed-')),
    ].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
    setReviews((current) => [review, ...current]);
    setSent(true);
    form.reset();
    setRating(5);
  }
  return (
    <section className="review-wall" aria-labelledby="review-wall-title">
      <div className="review-wall-heading">
        <div>
          <span className="eyebrow">NOT JUST OUR WORD FOR IT</span>
          <h2 id="review-wall-title">
            The mall people remember<span>.</span>
          </h2>
        </div>
        <p>
          <strong>4.9</strong>
          <span>
            ★★★★★<small>from our demo community</small>
          </span>
        </p>
      </div>
      <div className="review-layout">
        <div className="community-reviews">
          {reviews.slice(0, 4).map((review, index) => (
            <article
              key={review.id}
              className={index === 0 ? 'featured-review' : ''}
            >
              <div>
                <span>{'★'.repeat(review.rating)}</span>
                <small>
                  {review.id.startsWith('seed-')
                    ? 'Verified visitor'
                    : 'Just shared'}
                </small>
              </div>
              <h3>“{review.title}”</h3>
              <p>{review.body}</p>
              <footer>
                <b>{review.name}</b>
                <span>
                  <Check size={11} /> Community review
                </span>
              </footer>
            </article>
          ))}
        </div>
        <form className="review-form" onSubmit={submit}>
          <MessageCircle size={24} />
          <span className="eyebrow">YOUR TURN</span>
          <h3>How did the mall feel?</h3>
          <p>Share a quick review. It appears here instantly on this device.</p>
          <label>Your rating</label>
          <div
            className="star-picker"
            role="group"
            aria-label="Choose a rating"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                key={value}
                aria-label={`${value} star${value > 1 ? 's' : ''}`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
              >
                <Star
                  size={21}
                  fill={value <= rating ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          <label htmlFor="review-name">Your name</label>
          <input
            id="review-name"
            name="name"
            maxLength={40}
            required
            placeholder="First name or initials"
          />
          <label htmlFor="review-title">Review title</label>
          <input
            id="review-title"
            name="title"
            maxLength={60}
            required
            placeholder="What stood out?"
          />
          <label htmlFor="review-body">Your experience</label>
          <textarea
            id="review-body"
            name="body"
            maxLength={260}
            minLength={10}
            required
            placeholder="Tell other shoppers what you enjoyed…"
          />
          <button className="primary-button">
            Share my review <Send size={15} />
          </button>
          {sent ? (
            <span className="review-thanks" role="status">
              <Check size={14} /> Thank you — your review is now live.
            </span>
          ) : null}
        </form>
      </div>
    </section>
  );
}
