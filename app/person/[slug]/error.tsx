'use client';

export default function Error({ error }: { error: Error }) {
  console.error('Person route error:', error);
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Something went wrong</h1>
      <p style={{ marginTop: 8 }}>Please refresh the page.</p>
    </div>
  );
}
