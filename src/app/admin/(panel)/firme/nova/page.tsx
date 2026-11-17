import { getSettingsForAdmin } from "@/server/admin-settings";
import { AdminPage } from "../../../ui";
import { CompanyForm } from "../company-form";

export default async function NewCompanyPage() {
  const settings = await getSettingsForAdmin();
  return (
    <AdminPage title="Nova firma">
      <CompanyForm defaultFee={settings.settings.companyFeePercent} />
    </AdminPage>
  );
}
