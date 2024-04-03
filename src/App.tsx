import React from 'react';
import Canvas from './components/Canvas';

// Contexts
import { ToolboxProvider } from "./contexts/ToolboxContext";
import { AutomataInputProvider } from "./contexts/AutamataInputContext";

const App: React.FC = () => {
  return (
    // Esses 2 tem que sair daqui eventualmente
    // Isso tem q ser atribuido ao canvas, não ao app
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
