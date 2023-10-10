import React from 'react';
import Canvas from './components/Canvas';

// Contexts
import { ToolboxProvider, useToolboxContext } from "./contexts/ToolboxContext";

const App: React.FC = () => {
  return (
    <ToolboxProvider>
      <div className="App">
        <Canvas />
      </div>
    </ToolboxProvider>
  );
};

export default App;
