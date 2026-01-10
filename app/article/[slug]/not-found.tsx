export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Article not found</h1>
      <p style={{ marginTop: 8 }}>This article may be new and still indexing, or the slug is incorrect.</p>
    </div>
  );
}
