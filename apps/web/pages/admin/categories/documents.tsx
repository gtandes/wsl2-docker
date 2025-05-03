import React from "react";
import { AdminLayout } from "../../../components/AdminLayout";
import { CategoriesLayout } from "../../../components/categories/CategoriesLayout";
import { CategoriesView } from "../../../components/categories/CategoriesView";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup } from "../../../types/roles";

const Documents = () => {
  return (
    <AdminLayout>
      <CategoriesLayout>
        <CategoriesView type="document" />
      </CategoriesLayout>
    </AdminLayout>
  );
};

export default withAuth(Documents, AdminGroup);
