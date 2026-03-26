/// A numeric calculator with configurable decimal precision.
pub struct Calculator {
    precision: u32,
}

impl Calculator {
    /// Creates a new calculator with the given decimal precision.
    pub fn new(precision: u32) -> Self {
        Self { precision }
    }

    /// Returns the configured precision.
    pub fn precision(&self) -> u32 {
        self.precision
    }

    /// Adds two floating-point numbers.
    pub fn add(&self, a: f64, b: f64) -> f64 {
        self.round(a + b)
    }

    /// Subtracts `b` from `a`.
    pub fn subtract(&self, a: f64, b: f64) -> f64 {
        self.round(a - b)
    }

    /// Multiplies two floating-point numbers.
    pub fn multiply(&self, a: f64, b: f64) -> f64 {
        self.round(a * b)
    }

    /// Divides `a` by `b`. Returns `None` when `b` is zero.
    pub fn divide(&self, a: f64, b: f64) -> Option<f64> {
        if b == 0.0 {
            None
        } else {
            Some(self.round(a / b))
        }
    }

    fn round(&self, value: f64) -> f64 {
        let factor = 10_f64.powi(self.precision as i32);
        (value * factor).round() / factor
    }
}

/// A running statistical accumulator.
pub struct Stats {
    values: Vec<f64>,
}

impl Stats {
    /// Creates a new empty stats accumulator.
    pub fn new() -> Self {
        Self { values: Vec::new() }
    }

    /// Records a value.
    pub fn push(&mut self, value: f64) {
        self.values.push(value);
    }

    /// Returns the number of recorded values.
    pub fn count(&self) -> usize {
        self.values.len()
    }

    /// Computes the arithmetic mean. Returns `None` when empty.
    pub fn mean(&self) -> Option<f64> {
        if self.values.is_empty() {
            None
        } else {
            Some(self.values.iter().sum::<f64>() / self.values.len() as f64)
        }
    }

    /// Returns the minimum recorded value, or `None` when empty.
    pub fn min(&self) -> Option<f64> {
        self.values.iter().copied().reduce(f64::min)
    }

    /// Returns the maximum recorded value, or `None` when empty.
    pub fn max(&self) -> Option<f64> {
        self.values.iter().copied().reduce(f64::max)
    }
}

impl Default for Stats {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_works() {
        let calc = Calculator::new(2);
        assert_eq!(calc.add(1.1, 2.2), 3.3);
    }

    #[test]
    fn divide_by_zero_returns_none() {
        let calc = Calculator::new(2);
        assert_eq!(calc.divide(1.0, 0.0), None);
    }

    #[test]
    fn stats_mean() {
        let mut s = Stats::new();
        s.push(2.0);
        s.push(4.0);
        assert_eq!(s.mean(), Some(3.0));
    }
}
