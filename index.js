const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, Coffee Server!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppShell } from "./components/layout/AppShell";
import { useNavigationStore } from "./stores/useNavigationStore";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { PropertyDetailsPage } from "./pages/PropertyDetailsPage";
import { HostDashboardPage } from "./pages/HostDashboardPage";
import { SavedWishlistPage } from "./pages/SavedWishlistPage";
import { PropertyComparisonPage } from "./pages/PropertyComparisonPage";
import { NeighborhoodGuidePage } from "./pages/NeighborhoodGuidePage";
import { TenancyAgreementPage } from "./pages/TenancyAgreementPage";
import { FloatingCompareDock } from "./components/shared/FloatingCompareDock";

export default function App() {
  const { currentRoute } = useNavigationStore();

  return (
    <AppShell>
      {currentRoute.name === "home" && <HomePage />}
      {currentRoute.name === "search" && <SearchPage />}
      {currentRoute.name === "property" && <PropertyDetailsPage />}
      {currentRoute.name === "host-dashboard" && <HostDashboardPage />}
      {currentRoute.name === "wishlist" && <SavedWishlistPage />}
      {currentRoute.name === "compare" && <PropertyComparisonPage />}
      {currentRoute.name === "neighborhoods" && <NeighborhoodGuidePage />}
      {currentRoute.name === "agreement" && (
        <TenancyAgreementPage propertyId={currentRoute.propertyId} />
      )}
      <FloatingCompareDock />
    </AppShell>
  );
}
