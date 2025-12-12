// src/pages/DatasetView/index.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";

import DatasetViewPageTemplate from "../../components/templates/DatasetViewPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";
import { getDatasetByID } from "../../services/modules/dataset.api";
import { useToast } from "../../components/organisms/ToastProvider";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function DatasetView() {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Your generated param is named "index"
  const { index: datasetId } = useParams();

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDataset = useCallback(async () => {
    if (!datasetId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await getDatasetByID(datasetId);
      setDataset(res);
    } catch (err) {
      const message = err?.message || "Failed to fetch dataset";
      showToastRef.current?.(message, "error");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  return (
    <ProtectedRoute>
      <DashboardLayout activeKey="datasets">
        <DatasetViewPageTemplate dataset={dataset} loading={loading} error={error} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
