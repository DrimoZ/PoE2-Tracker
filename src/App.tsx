import { useEffect, useState } from 'react';

import './App.css';

import ApiManagerDashboard from './components/api-manager-dashboard/api-manager-dashboard.component';
import { RequestsManager } from './services/requests.manager';

function App() {
    const [headerHeight, setHeaderHeight] = useState(150);
    const [footerHeight, setFooterHeight] = useState(150);

    useEffect(() => {
        const updateHeights = () => {
            const header = document.querySelector('.App-header') as HTMLElement | null;
            const footer = document.querySelector('.App-footer') as HTMLElement | null;

            if (header) setHeaderHeight(header.offsetHeight);
            if (footer) setFooterHeight(footer.offsetHeight);

            const mainContent = document.querySelector('.App-main') as HTMLElement | null;
            if (mainContent) {
                mainContent.style.top = `calc(1rem + ${headerHeight}px)`;
                mainContent.style.bottom = `calc(1rem + ${footerHeight}px)`;
            }
        };

        updateHeights();
        window.addEventListener('resize', updateHeights);

        return () => {
            window.removeEventListener('resize', updateHeights);
        };
    }, [footerHeight, headerHeight]);

    RequestsManager.instance.start();

    return (
        <div className="App">
            <header className="App-header">
                <h1>PoE 2 Trade Api Tracker - Dashboard</h1>
            </header>

            <main className="App-main">
                <ApiManagerDashboard />
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
    );
}

export default App;
