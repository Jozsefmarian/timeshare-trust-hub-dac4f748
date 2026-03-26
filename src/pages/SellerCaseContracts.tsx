import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function SellerCaseContracts() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (caseId) {
      navigate(`/seller/cases/${caseId}`, { replace: true });
    }
  }, [caseId, navigate]);

  return null;
}
