import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from policy import rejection_reason


class RejectionPolicyTests(unittest.TestCase):
    def test_good_evidence_is_accepted(self):
        self.assertIsNone(rejection_reason(0.82, 0.30, 0.9, 0.1))

    def test_low_confidence_rejects(self):
        self.assertEqual(rejection_reason(0.50, 0.30, 0.9, 0.1), "low_confidence")

    def test_low_margin_rejects(self):
        self.assertEqual(rejection_reason(0.80, 0.05, 0.9, 0.1), "low_margin")

    def test_ood_rejects(self):
        self.assertEqual(rejection_reason(0.90, 0.40, 0.9, 0.6), "out_of_distribution")

    def test_poor_evidence_has_priority(self):
        self.assertEqual(rejection_reason(0.20, 0.01, 0.2, 0.9), "poor_evidence")

    def test_calibrated_policy_overrides_defaults(self):
        policy = {
            "confidence_floor": 0.70,
            "margin_floor": 0.20,
            "ood_ceiling": 0.25,
            "evidence_quality_floor": 0.50,
        }
        self.assertEqual(rejection_reason(0.68, 0.25, 0.8, 0.1, policy=policy), "low_confidence")
        self.assertEqual(rejection_reason(0.80, 0.18, 0.8, 0.1, policy=policy), "low_margin")
        self.assertEqual(rejection_reason(0.80, 0.30, 0.8, 0.30, policy=policy), "out_of_distribution")

    def test_nonconservative_ignores_calibrated_policy(self):
        policy = {"confidence_floor": 0.95}
        self.assertIsNone(rejection_reason(0.60, 0.20, 0.8, 0.1, conservative=False, policy=policy))


if __name__ == "__main__":
    unittest.main()
