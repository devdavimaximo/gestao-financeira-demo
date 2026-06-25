import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transacoes" element={<Transactions />} />
          <Route path="/contas" element={<Accounts />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/orcamentos" element={<Budgets />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
