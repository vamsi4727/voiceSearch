import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import AudioRecorder from './components/AudioRecorder';

import './App.css';
import TrainingDataViewer from './components/TrainingDataViewer';

function App() {
  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li><Link to="/">Speech Recognition</Link></li>
            <li><Link to="/training">Training Data View</Link></li>
          
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<AudioRecorder />} />
          <Route path="/training" element={<TrainingDataViewer />} />
          
        </Routes>
      </div>
    </Router>
  );
}

export default App;