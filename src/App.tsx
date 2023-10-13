import React from 'react';
import Canvas from './components/Canvas';

// Contexts
import { ToolboxProvider } from "./contexts/ToolboxContext";
import { AutomataInputProvider } from "./contexts/AutamataInputContext";

const App: React.FC = () => {
  return (
    <ToolboxProvider>
      <AutomataInputProvider>
      <div className="App">
        <Canvas />
      </div>
      </AutomataInputProvider>
    </ToolboxProvider>
  );
};

export default App;
