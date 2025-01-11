import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import './App.css';
import ApiManagerDashboard from './components/api-manager-dashboard/api-manager-dashboard.component';
import { RequestsManager } from './services/requests.manager';

function App() {

    useEffect(() => {
        RequestsManager.instance.start();
    }, []);
    
    return (
        <Router>
            <div className="App">
                <header className="App-header">
                    <h1>PoE 2 Trade Api Tracker</h1>
                </header>

                <main className="App-main">
                    <Routes>
                        <Route path="/dashboard" element={<ApiManagerDashboard />} />
                        {/* Additional routes can be added here */}
                    </Routes>
                </main>

                <footer className="App-footer">
                    <p className="App-footer-links">
                        <a className="App-footer-link" href="https://www.pathofexile2.com/">Path of Exile 2</a> |{' '}
                        <a className="App-footer-link" href="https://www.pathofexile.com/trade2">PoE2 Trade</a> |{' '}
                        <a className="App-footer-link" href="https://discord.gg/pathofexile">PoE Discord</a>
                    </p>
                    <p className="App-footer-disclaimer">
                        This product isn't affiliated with or endorsed by Grinding Gear Games in any way.
                    </p>
                </footer>
            </div>
        </Router>
    );
}

export default App;
