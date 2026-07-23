import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import WebsiteRendererV3 from "../../components/public-site/WebsiteRendererV3";
import { normalizeWebsiteConfig } from "../../features/website-studio/websiteConfig";
import { websiteStudioV3Api } from "../../services/websiteStudioV3";

export default function InstitutionLandingPage() {
  const { institutionCode = "EDUCARE" } = useParams();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setConfig(null);
    setError("");

    websiteStudioV3Api
      .getPublic(institutionCode)
      .then((response) => {
        if (active) {
          setConfig(normalizeWebsiteConfig(response.data));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError?.response?.data?.message ||
              requestError.message ||
              "Published website is not available."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [institutionCode]);

  if (error) {
    return (
      <div className="ws3-public-state">
        <h1>Website unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="ws3-public-state">
        Loading published website...
      </div>
    );
  }

  return <WebsiteRendererV3 config={config} />;
}
