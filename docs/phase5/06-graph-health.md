# Graph Health Metrics

`computeGraphHealth(organizationId)` returns:

| Metric | Description |
|--------|-------------|
| `orphanDocuments` | Published docs with zero relations |
| `disconnectedClusters` | Union-find cluster count minus main component |
| `brokenReferences` | Unresolved `[[wiki links]]` in content |
| `missingLinks` | Pending `relationship_suggestions` count |
| `mostConnected` | Top 10 by edge count |
| `knowledgeSilos` | Departments with many docs, few external links |

Integrated into `getHealthDashboard()` as `graphHealth`.

Document health scoring now includes `linkCount` connectivity boost.
