// features/data-selection/components/DataSelectionPanel.tsx
"use client"

import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DataType, DataSelection, DataFilters } from "../hooks/useDataSelection"

type ClinicalData = {
  conditions: any[]
  medications: any[]
  allergies: any[]
  diagnosticReports: any[]
  observations: any[]
}

interface DataItem {
  id: DataType
  label: string
  description: string
  count: number
  category?: string
}

interface DataSelectionPanelProps {
  clinicalData: ClinicalData
  selectedData: DataSelection
  filters: DataFilters
  onSelectionChange: (selectedData: DataSelection) => void
  onFiltersChange: (filters: DataFilters) => void
}

export function DataSelectionPanel({
  clinicalData,
  selectedData,
  filters,
  onSelectionChange,
  onFiltersChange,
}: DataSelectionPanelProps) {
  const { t } = useLanguage()

  const dataCategories: DataItem[] = [
    {
      id: "conditions",
      label: t("dataSelection.conditions"),
      description: t("dataSelection.conditionsDesc"),
      count: clinicalData.conditions?.length || 0,
      category: "clinical",
    },
    {
      id: "medications",
      label: t("dataSelection.medications"),
      description: t("dataSelection.medicationsDesc"),
      count: clinicalData.medications?.length || 0,
      category: "medication",
    },
    {
      id: "allergies",
      label: t("dataSelection.allergies"),
      description: t("dataSelection.allergiesDesc"),
      count: clinicalData.allergies?.length || 0,
      category: "clinical",
    },
    {
      id: "diagnosticReports",
      label: t("dataSelection.diagnosticReports"),
      description: t("dataSelection.diagnosticReportsDesc"),
      count: clinicalData.diagnosticReports?.length || 0,
      category: "diagnostics",
    },
    {
      id: "observations",
      label: t("dataSelection.observations"),
      description: t("dataSelection.observationsDesc"),
      count: clinicalData.observations?.length || 0,
      category: "clinical",
    },
  ]

  const handleToggle = (id: DataType, checked: boolean) => {
    onSelectionChange({
      ...selectedData,
      [id]: checked,
    } as DataSelection)
  }

  const handleToggleAll = (checked: boolean) => {
    const newSelection = { ...selectedData } as DataSelection
    dataCategories.forEach(item => {
      newSelection[item.id] = checked
    })
    onSelectionChange(newSelection)
  }

  const handleFilterChange = (key: keyof DataFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const allSelected = dataCategories.every(item => selectedData[item.id])
  const someSelected = dataCategories.some(item => selectedData[item.id]) && !allSelected

  const renderMedicationFilter = () => (
    <div className="mt-2 pl-6 space-y-2">
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-muted-foreground">{t("dataSelection.medicationStatus")}</span>
        <Select
          value={filters.medicationStatus}
          onValueChange={(value) => handleFilterChange("medicationStatus", value as "active" | "all")}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder={t("dataSelection.selectStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("dataSelection.activeOnly")}</SelectItem>
            <SelectItem value="all">{t("dataSelection.allMedications")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderVitalSignsFilters = () => (
    <div className="mt-2 pl-6 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">{t("dataSelection.reportVersion")}</span>
          <Select
            value={filters.vitalSignsVersion || "latest"}
            onValueChange={(value) => handleFilterChange("vitalSignsVersion", value as "latest" | "all")}
            defaultValue="latest"
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder={t("dataSelection.selectVersion")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">{t("dataSelection.latestOnly")}</SelectItem>
              <SelectItem value="all">{t("dataSelection.allVersions")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">{t("dataSelection.timeRange")}</span>
          <Select
            value={filters.vitalSignsTimeRange || "1m"}
            onValueChange={(value) =>
              handleFilterChange("vitalSignsTimeRange", value as "24h" | "3d" | "1w" | "1m" | "3m" | "all")
            }
            defaultValue="1m"
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder={t("dataSelection.selectTimeRange")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{t("dataSelection.last24Hours")}</SelectItem>
              <SelectItem value="3d">{t("dataSelection.last3Days")}</SelectItem>
              <SelectItem value="1w">{t("dataSelection.lastWeek")}</SelectItem>
              <SelectItem value="1m">{t("dataSelection.lastMonth")}</SelectItem>
              <SelectItem value="3m">{t("dataSelection.last3Months")}</SelectItem>
              <SelectItem value="all">{t("dataSelection.allTime")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderLabReportFilters = () => (
    <div className="mt-2 pl-6 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">{t("dataSelection.reportVersion")}</span>
          <Select
            value={filters.labReportVersion}
            onValueChange={(value) => handleFilterChange("labReportVersion", value as "latest" | "all")}
            defaultValue="latest"
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue>
                {filters.labReportVersion === "latest"
                  ? t("dataSelection.latestReportOnly")
                  : t("dataSelection.allReports")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">{t("dataSelection.latestReportOnly")}</SelectItem>
              <SelectItem value="all">{t("dataSelection.allReports")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">{t("dataSelection.timeRange")}</span>
          <Select
            value={filters.reportTimeRange || "1m"}
            onValueChange={(value) => handleFilterChange("reportTimeRange", value as "1w" | "1m" | "3m" | "6m" | "1y" | "all")}
            defaultValue="1m"
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder={t("dataSelection.selectTimeRange")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1w">{t("dataSelection.lastWeek")}</SelectItem>
              <SelectItem value="1m">{t("dataSelection.lastMonth")}</SelectItem>
              <SelectItem value="3m">{t("dataSelection.last3Months")}</SelectItem>
              <SelectItem value="6m">{t("dataSelection.last6Months")}</SelectItem>
              <SelectItem value="1y">{t("dataSelection.lastYear")}</SelectItem>
              <SelectItem value="all">{t("dataSelection.allTime")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">{t("dataSelection.dataCategories")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("dataSelection.dataCategoriesDescription")}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleToggleAll(!allSelected)}>
            {allSelected ? t("dataSelection.deselectAll") : t("dataSelection.selectAll")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {dataCategories.map(({ id, label, description, count }) => (
          <Card key={id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start space-x-3">
              <Checkbox
                id={`data-${id}`}
                checked={!!selectedData[id]}
                onCheckedChange={(checked) => handleToggle(id, checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`data-${id}`} className="font-medium text-sm flex items-center">
                      {label}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1">
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">{t("common.info")}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                  <Badge
                    variant={selectedData[id] ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {count} {count == 1 ? t("dataSelection.item") : t("dataSelection.items")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>

                {id === "medications" && selectedData.medications && renderMedicationFilter()}
                {id === "observations" && selectedData.observations && renderVitalSignsFilters()}
                {id === "diagnosticReports" && selectedData.diagnosticReports && renderLabReportFilters()}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
