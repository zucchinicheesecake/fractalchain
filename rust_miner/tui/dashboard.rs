use crate::miner_stats::MinerStats;

pub fn run_dashboard(stats: &mut MinerStats) {
    println!("Dashboard running...");
    println!("Initial Stats: {:?}", stats);
}
