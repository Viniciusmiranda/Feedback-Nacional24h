# Implementation Plan - Populate Reports Tab

The "Relatórios" tab is currently empty because there is no corresponding `view-relatorios` section in the HTML. I will create this section by combining the existing, but unconnected, `view-reviews` (Detailed Reviews) and `view-export` (Export Data) sections.

## Proposed Changes

### Frontend

#### [MODIFY] [dashboard.html](file:///home/vini_miranda/Documentos/Repositórios/app.avaliaja.app.br/frontend/dashboard.html)

- **Create `view-relatorios` container**:
    - Add a new `div` with `id="view-relatorios"` and class `view-section`.
- **Consolidate Content**:
    - Move the content from `view-export` (Export buttons) into the top of `view-relatorios`.
    - Move the content from `view-reviews` (Detailed Reviews Table) into `view-relatorios` below the export section.
    - Remove the redundant `view-export` and `view-reviews` containers.
- **Update Navigation Logic**:
    - Ensure `switchTab('relatorios')` correctly activates the new view.
    - Update `titleMap` in `switchView` to set the page title for 'relatorios'.

## Verification Plan

### Manual Verification
- **Click "Relatórios" sidebar item**:
    - Verify that the main content area changes to show the Reports view.
    - Verify the title says "Relatórios e Exportação" (or similar).
- **Check Functionality**:
    - **Export Buttons**: Verify "Baixar Planilha" and "PDF" buttons are visible and clickable.
    - **Table**: Verify the "Avaliações" table loads data (it uses `loadMoreReviews` which fetches from API).
