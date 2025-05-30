'use client';

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Button,
  Input,
  Listbox,
  ListboxItem,
  Switch,
  Kbd,
  Navbar,
} from "@heroui/react";
import { ThemeSwitch } from "../../components/theme-switch";

const NetworkGraph = dynamic(() => import("../../components/NetworkGraph"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
  ),
});

export default function VastChallengePage() {
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    switch1: true,
    switch2: false,
    collaboratedWith: false,
    influenced: false,
    layoutType: "forceatlas" as "forceatlas" | "circular",
  });

  const conditions = [
    { id: "collaboratedWith", label: "Collaborated with" },
    { id: "influenced", label: "Influenced" },
  ];

  const handleSearch = () => {
    setSearchTerm(keyword);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleConditionChange = (id: string, checked: boolean) => {
    setFilters((prev) => ({ ...prev, [id]: checked }));
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Navbar
        title="VAST Challenge 2025"
        className="mb-8 shadow-lg dark:shadow-gray-800"
      />

      {/* tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search nodes..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              startContent={
                <span className="i-heroicons-magnifying-glass-20-solid text-gray-400" />
              }
              endContent={<Kbd keys={["command"]}>K</Kbd>}
              className="flex-1"
            />
            <Button color="primary" onClick={handleSearch}>
              Search
            </Button>

            <div className="mt-3">
              Change Theme:
              <br />
              <ThemeSwitch />
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <Listbox
              label="Layout Engine:"
              selectedKeys={[filters.layoutType]}
              onSelectionChange={(keys) =>
                setFilters({ ...filters, layoutType: Array.from(keys)[0] as any })
              }
              className="w-48"
            >
              <ListboxItem key="forceatlas">Force Atlas</ListboxItem>
              <ListboxItem key="circular">Circular</ListboxItem>
            </Listbox>

            <div className="space-y-2">
              <Switch
                isSelected={filters.switch1}
                onValueChange={(val) => setFilters({ ...filters, switch1: val })}
              >
                Switch1
              </Switch>
              <Switch
                isSelected={filters.switch2}
                onValueChange={(val) => setFilters({ ...filters, switch2: val })}
              >
                 Influenced by
              </Switch>
            </div>
          </div>
        </div>

        {/* filters */}
        <div className="border-l pl-6 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-3">Conditions</h3>
          <div className="space-y-2">
            {conditions.map(({ id, label }) => (
              <div key={id} className="flex items-center gap-2">
                <input
                  id={id}
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                  checked={filters[id as keyof typeof filters] as boolean}
                  onChange={(e) => handleConditionChange(id, e.target.checked)}
                />
                <label htmlFor={id} className="text-sm cursor-pointer">
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visualization area */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-4 border dark:border-gray-800">
        {searchTerm && (
          <NetworkGraph
            keyword={searchTerm}
            filters={filters}
            className="h-[700px] rounded-lg overflow-hidden"
          />
        )}
      </div>
    </main>
  );
}
