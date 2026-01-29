export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Test Page</h1>
      <p>If you can see this, the deployment is working.</p>
      <button 
        onClick={() => alert('Button works!')}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        Click Me
      </button>
    </div>
  );
}
