import React, { useEffect, useMemo, useState } from 'react';

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
  submitFeedback?: (eventId: string, rating: number, comment: string) => Promise<any>;
  getFeedbacks?: (eventId: string) => Promise<any[]>;
}

export const ReviewRating: React.FC<ReviewRatingProps> = ({ 
  eventId, 
  userName,
  submitFeedback,
  getFeedbacks
}) => {
  const storageKey = `event_reviews_${eventId}`;
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [reviews, setReviews] = useState<Review[]>([]);

  // Helper to map backend feedbacks to UI reviews
  const mapFeedback = (fb: any): Review => ({
    id: fb.feedbackId || fb.SK || `fb_${Math.random()}`,
    rating: fb.rating,
    text: fb.comment || '',
    author: fb.userEmail || fb.userId || 'Thành viên',
    createdAt: fb.createdAt || new Date().toISOString()
  });

  // Load reviews on mount or when eventId/getFeedbacks changes
  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        if (getFeedbacks) {
          const backendFeedbacks = await getFeedbacks(eventId);
          if (backendFeedbacks && backendFeedbacks.length > 0) {
            setReviews(backendFeedbacks.map(mapFeedback));
            setLoading(false);
            return;
          }
        }
        // Fallback to localStorage if no API or empty list
        const saved = localStorage.getItem(storageKey);
        setReviews(saved ? JSON.parse(saved) : []);
      } catch (err: any) {
        setError(err.message || 'Không thể tải danh sách đánh giá.');
        const saved = localStorage.getItem(storageKey);
        setReviews(saved ? JSON.parse(saved) : []);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [eventId, getFeedbacks, storageKey]);

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (submitFeedback) {
        // Submit review to backend database
        const newFb = await submitFeedback(eventId, rating, text.trim());
        const newReview = mapFeedback(newFb);
        setReviews(prev => [newReview, ...prev]);
      } else {
        // Fallback to local storage
        const nextReviews = [
          {
            id: `rev_${Date.now()}`,
            rating,
            text: text.trim(),
            author: userName || 'Khách tham dự',
            createdAt: new Date().toISOString(),
          },
          ...reviews,
        ];
        setReviews(nextReviews);
        localStorage.setItem(storageKey, JSON.stringify(nextReviews));
      }
      setRating(5);
      setText('');
    } catch (err: any) {
      setError(err.message || 'Gửi đánh giá thất bại. Bạn phải đăng ký sự kiện trước khi viết đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="reviews-panel card-glass">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Đánh giá sự kiện</h2>
          <p className="text-secondary">
            {reviews.length > 0 ? `${average.toFixed(1)} / 5 từ ${reviews.length} đánh giá` : 'Chưa có đánh giá nào.'}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}

      <form className="review-form" onSubmit={handleSubmit}>
        <div className="star-rating" aria-label="Chọn số sao">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={star <= rating ? 'active' : ''}
              onClick={() => setRating(star)}
              aria-label={`${star} sao`}
              disabled={loading}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Viết cảm nhận của bạn về sự kiện..."
          rows={4}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </form>

      <div className="review-list">
        {reviews.map((review) => (
          <article key={review.id} className="review-item">
            <div className="review-meta">
              <strong style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{review.author}</strong>
              <span style={{ marginLeft: '10px' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
            </div>
            <p style={{ marginTop: '5px' }}>{review.text}</p>
            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(review.createdAt).toLocaleString('vi-VN')}</span>
          </article>
        ))}
      </div>
    </section>
  );
};
