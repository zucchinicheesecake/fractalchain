mod miner_stats;
mod tui;

use miner_stats::MinerStats;
use std::time::Duration;

fn main() {
    let mut stats = MinerStats::default();
    let mut last_update = std::time::Instant::now();
    
    tui::run_dashboard(&mut stats);
    
    loop {
        if last_update.elapsed() >= Duration::from_secs(1) {
            stats.hash_rate = 42.0;
            stats.total_hashes += 1000;
            last_update = std::time::Instant::now();
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}