import { useState } from 'react';

export default function TestPage() {
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    alert('Form submitted successfully!');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Interactive Test Page</h1>
      
      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Test 1: Checkbox</h2>
        <label htmlFor="test-checkbox" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            id="test-checkbox"
            type="checkbox"
            checked={checkboxChecked}
            onChange={(e) => setCheckboxChecked(e.target.checked)}
            style={{ marginRight: '10px', width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span>Test checkbox (currently: {checkboxChecked ? 'CHECKED ✓' : 'UNCHECKED'})</span>
        </label>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Test 2: Button Click</h2>
        <button
          onClick={() => setClickCount(clickCount + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Click me!
        </button>
        <p>Button clicked: {clickCount} times</p>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Test 3: Form Submit</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="test@example.com"
            required
            style={{
              padding: '10px',
              fontSize: '16px',
              width: '100%',
              marginBottom: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#00aa00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              width: '100%'
            }}
          >
            Submit Form
          </button>
        </form>
        {formSubmitted && <p style={{ color: 'green', marginTop: '10px' }}>✓ Form submitted!</p>}
      </div>

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Try clicking the checkbox - it should toggle</li>
          <li>Try clicking the button - the counter should increase</li>
          <li>Try submitting the form - you should see an alert</li>
        </ol>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          If any of these don't work, JavaScript is not running properly in your browser.
        </p>
        <a href="/login" style={{ display: 'inline-block', marginTop: '20px', color: '#0066cc' }}>
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
