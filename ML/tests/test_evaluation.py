from ML.app.main import _fallback_data, _evaluate_leave_one_out


def test_evaluation_runs():
    products, interactions = _fallback_data()
    metrics = _evaluate_leave_one_out(interactions, products, k_values=(1,3,5))
    assert isinstance(metrics, dict)
    # even on small demo dataset the function should return keys
    assert 'P@1' in metrics and 'MAP@3' in metrics and 'NDCG@5' in metrics
