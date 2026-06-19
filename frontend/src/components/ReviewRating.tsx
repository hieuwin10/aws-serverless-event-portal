import React, { useMemo, useState } from 'react';

interface Review {
  id: string;
  rating: number;
  text: string;
  author: string;
  createdAt: string;
}

interface ReviewRatingProps {
  eventId: string;
  userName?: string;
}

export const ReviewRating: React.FC<ReviewRatingProps> = ({ eventId, userName }) => {
  const storageKey = `event_reviews_${eventId}`;
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;

    const nextReviews = [
      {
        id: `rev_${Date.now()}`,
        rating,
        text: text.trim(),
        author: userName || 'Khach tham du',
        createdAt: new Date().toISOString(),
      },
      ...reviews,
    ];

    setReviews(nextReviews);
    localStorage.setItem(storageKey, JSON.stringify(nextReviews));
    setRating(5);
    setText('');
  };

  return (
    <section className="reviews-panel card-glass">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Danh Gia Su Kien</h2>
          <p className="text-secondary">
            {reviews.length > 0 ? `${average.toFixed(1)} / 5 tu ${reviews.length} danh gia` : 'Chua co danh gia nao.'}
          </p>
        </div>
      </div>

      <form className="review-form" onSubmit={handleSubmit}>
        <div className="star-rating" aria-label="Chon so sao">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={star <= rating ? 'active' : ''}
              onClick={() => setRating(star)}
              aria-label={`${star} sao`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Viet cam nhan cua ban ve su kien..."
          rows={4}
        />
        <button type="submit" className="btn-primary">Gui Danh Gia</button>
      </form>

      <div className="review-list">
        {reviews.map((review) => (
          <article key={review.id} className="review-item">
            <div className="review-meta">
              <strong>{review.author}</strong>
              <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
            </div>
            <p>{review.text}</p>
            <span className="text-secondary">{new Date(review.createdAt).toLocaleString('vi-VN')}</span>
          </article>
        ))}
      </div>
    </section>
  );
};
