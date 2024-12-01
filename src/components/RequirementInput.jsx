import { useState } from 'react';
import { UploadIcon } from '@heroicons/react/solid';  // Optional for icons

function RequirementInput() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !text) {
      alert('Please upload a file or enter text.');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('text', text);

    try {
      const response = await fetch('http://localhost:5001/api/submit-requirement', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setSubmissionSuccess(true);
      console.log('Submission result:', result);
    } catch (error) {
      console.error('Error submitting requirement:', error);
      setSubmissionSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-500 via-pink-500 to-red-500">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full">
        <h2 className="text-4xl font-bold text-center text-white mb-6">
          Sasta GenAI
        </h2>
        <p className="text-center text-white mb-8">
          Upload your requirement file or enter the text below
        </p>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg p-4 mb-6 shadow-md">
            <div className="flex items-center mb-4">
              <UploadIcon className="h-5 w-5 text-gray-500 mr-2" />
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                Upload Requirement File
              </label>
            </div>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-400 transition duration-150 ease-in-out"
            />
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 shadow-md">
            <label htmlFor="requirement-text" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Requirement Text
            </label>
            <textarea
              value={text}
              onChange={handleTextChange}
              rows="4"
              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-400 transition duration-150 ease-in-out"
              placeholder="Describe your requirement here..."
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold 
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 
              transition duration-150 ease-in-out shadow-md ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? 'Submitting...' : 'Submit Requirement'}
          </button>

          {submissionSuccess && (
            <div className="mt-4 text-green-700 bg-green-100 p-2 rounded-md">
              Submission successful!
            </div>
          )}

          {submissionSuccess === false && (
            <div className="mt-4 text-red-700 bg-red-100 p-2 rounded-md">
              Submission failed. Please try again.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default RequirementInput;
