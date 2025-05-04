use std::time::Instant;

#[derive(Debug)]
pub struct MinerStats {
    pub start_time: Instant,
    pub hash_rate: f64,
    pub total_hashes: u64,
}

impl Default for MinerStats {
    fn default() -> Self {
        Self {
            start_time: Instant::now(),
            hash_rate: 0.0,
            total_hashes: 0,
        }
    }
}