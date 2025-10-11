output "app_service_url" {
  value = azurerm_linux_web_app.app_service.default_hostname
  description = "URL of the deployed web app"
}

output "resource_group_name" {
  value = azurerm_resource_group.rg.name
  description = "Name of the Azure Resource Group"
}

output "storage_account_name" {
  value = azurerm_storage_account.tfstate_storage.name
  description = "Name of the Azure Storage Account for backend state"
}
