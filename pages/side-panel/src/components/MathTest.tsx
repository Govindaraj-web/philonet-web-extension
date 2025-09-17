import React, { useEffect, useState } from 'react';
import { renderMathExpressions } from '../utils/markdownRenderer';
import { loadKaTeX, isKaTeXLoaded } from '../utils/katexLoader';

const MathTest: React.FC = () => {
  const [katexStatus, setKatexStatus] = useState('loading');
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const testMath = async () => {
      console.log('🧪 Starting math test...');
      
      // Load KaTeX first
      try {
        await loadKaTeX();
        setKatexStatus('loaded');
        console.log('✅ KaTeX loaded for test');
      } catch (error) {
        setKatexStatus('error');
        console.error('❌ KaTeX loading failed:', error);
        return;
      }

      // Test different math formats
      const testCases = [
        '[ ds^2 = -f(r)dt^2 + \\frac{dr^2}{f(r)} + r^2 d\\phi^2 + \\alpha^2 r^2 dz^2 ]',
        '$E = mc^2$',
        '$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$',
        'Plain text with [ V_e = \\frac{1}{r^2} ] embedded'
      ];

      const results = testCases.map((testCase, index) => {
        console.log(`🧪 Testing case ${index + 1}: ${testCase}`);
        const result = renderMathExpressions(testCase);
        console.log(`🧪 Result ${index + 1}: ${result}`);
        return result;
      });

      setTestResults(results);
    };

    testMath();
  }, []);

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h2 className="text-xl mb-4">KaTeX Math Rendering Test</h2>
      
      <div className="mb-4">
        <strong>KaTeX Status:</strong> 
        <span className={`ml-2 px-2 py-1 rounded ${
          katexStatus === 'loaded' ? 'bg-green-600' : 
          katexStatus === 'error' ? 'bg-red-600' : 'bg-yellow-600'
        }`}>
          {katexStatus}
        </span>
      </div>

      <div className="mb-4">
        <strong>KaTeX Available:</strong> {isKaTeXLoaded() ? '✅ Yes' : '❌ No'}
      </div>

      <div className="space-y-4">
        {testResults.map((result, index) => (
          <div key={index} className="border border-gray-700 p-4 rounded">
            <h3 className="text-sm text-gray-400 mb-2">Test Case {index + 1}</h3>
            <div 
              className="bg-gray-800 p-3 rounded"
              dangerouslySetInnerHTML={{ __html: result }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MathTest;
