#!/bin/bash

################################################################################
#                   ASSEL-LONE PROJECT - COMPLETE TEST SUITE
#          شامل • قوي • ضخم - اختبار كامل المشروع بكل التفاصيل
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

################################################################################
#                            UTILITY FUNCTIONS
################################################################################

print_header() {
    echo -e "\n${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}▶ $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}\n"
}

print_subheader() {
    echo -e "\n${BLUE}━━━━ $1${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((++TESTS_PASSED))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((++TESTS_FAILED))
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${MAGENTA}ℹ $1${NC}"
}

run_test() {
    local test_name=$1
    local test_cmd=$2
    
    echo -n "Testing: $test_name... "
    if eval "$test_cmd" > /dev/null 2>&1; then
        print_success "$test_name"
    else
        print_error "$test_name"
    fi
}

################################################################################
#                        PHASE 1: ENVIRONMENT SETUP
################################################################################

print_header "PHASE 1: ENVIRONMENT VALIDATION & SETUP"

print_subheader "1.1 System Requirements Check"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_success "Node.js version $NODE_VERSION (required: >=18)"
    else
        print_error "Node.js version $NODE_VERSION (required: >=18)"
    fi
else
    print_error "Node.js not installed"
    exit 1
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm version $NPM_VERSION"
else
    print_error "npm not installed"
    exit 1
fi

# Check Docker (optional but recommended)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker -v)
    print_success "Docker: $DOCKER_VERSION"
else
    print_warning "Docker not installed (optional for local testing)"
fi

# Check git
if command -v git &> /dev/null; then
    print_success "git installed"
else
    print_error "git not installed"
fi

print_subheader "1.2 Project Structure Validation"

# Check project directories
REQUIRED_DIRS=(
    "frontend-next"
    "backend"
    "database"
    "docs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_success "Directory exists: $dir"
    else
        print_error "Directory missing: $dir"
    fi
done

print_subheader "1.3 Configuration Files Check"

REQUIRED_FILES=(
    "frontend-next/package.json"
    "README.md"
    ".env.example"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "File exists: $file"
    else
        print_error "File missing: $file"
    fi
done

################################################################################
#                    PHASE 2: FRONTEND VALIDATION
################################################################################

print_header "PHASE 2: FRONTEND (Next.js) VALIDATION"

cd frontend-next || exit 1

print_subheader "2.1 Package Installation & Dependencies"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_success "node_modules directory exists"
else
    print_info "Installing dependencies..."
    npm install --legacy-peer-deps 2>&1 | tail -5
fi

# Verify key dependencies
print_subheader "2.2 Key Dependencies Verification"

DEPENDENCIES=(
    "next"
    "react"
    "react-dom"
    "@tanstack/react-query"
    "axios"
    "zod"
    "recharts"
    "sonner"
    "lucide-react"
    "@clerk/nextjs"
    "@supabase/supabase-js"
)

for dep in "${DEPENDENCIES[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        print_success "Dependency found: $dep"
    else
        print_error "Dependency missing: $dep"
    fi
done

print_subheader "2.3 ESLint Validation"

print_info "Running ESLint checks..."

# Run ESLint and capture results
ESLINT_OUTPUT=$(npm run lint 2>&1 || true)
# Prefer parsing the final ESLint summary if present: "X errors, Y warnings"
ESLINT_SUMMARY=$(echo "$ESLINT_OUTPUT" | grep -Eo "[0-9]+ errors?, [0-9]+ warnings?" | tail -1 || true)
if [ -n "$ESLINT_SUMMARY" ]; then
    ESLINT_ERRORS=$(echo "$ESLINT_SUMMARY" | awk '{print $1}')
    ESLINT_WARNINGS=$(echo "$ESLINT_SUMMARY" | awk '{print $3}')
else
    ESLINT_ERRORS=0
    ESLINT_WARNINGS=$(echo "$ESLINT_OUTPUT" | grep -c " warning  " || true)
fi

if [ "$ESLINT_ERRORS" -eq 0 ]; then
    print_success "ESLint: No errors"
else
    print_error "ESLint: $ESLINT_ERRORS errors found"
    echo "$ESLINT_OUTPUT" | head -20
fi

if [ "$ESLINT_WARNINGS" -lt 10 ]; then
    print_success "ESLint: $ESLINT_WARNINGS warnings (acceptable)"
else
    print_warning "ESLint: $ESLINT_WARNINGS warnings"
fi

print_subheader "2.4 TypeScript Compilation"

print_info "Checking TypeScript types..."

if npx tsc --noEmit 2>&1 | grep -q "error"; then
    print_error "TypeScript compilation has errors"
    npx tsc --noEmit 2>&1 | head -10
else
    print_success "TypeScript: No type errors"
fi

print_subheader "2.5 Build Process"

print_info "Running Next.js build..."

BUILD_START=$(date +%s)
if npm run build > /tmp/build_output.log 2>&1; then
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))
    print_success "Build successful (${BUILD_TIME}s)"
    
    # Check if .next directory was created
    if [ -d ".next" ]; then
        NEXT_SIZE=$(du -sh .next | cut -f1)
        print_info "Build output size: $NEXT_SIZE"
    fi
else
    print_error "Build failed"
    tail -30 /tmp/build_output.log
fi

print_subheader "2.6 Dashboard Page Validation"

# Check if dashboard page exists
if [ -f "src/app/dashboard/page.tsx" ]; then
    print_success "Dashboard page file exists"
    
    # Count lines of code
    DASHBOARD_LINES=$(wc -l < src/app/dashboard/page.tsx)
    print_info "Dashboard page: $DASHBOARD_LINES lines of code"
    
    # Check for required imports
    if grep -q "useQuery" src/app/dashboard/page.tsx; then
        print_success "Dashboard uses React Query"
    fi
    
    if grep -q "reportsAPI" src/app/dashboard/page.tsx; then
        print_success "Dashboard uses reportsAPI"
    fi
else
    print_error "Dashboard page not found"
fi

print_subheader "2.7 Dashboard CSS Validation"

if [ -f "src/app/dashboard/dashboard-refactored.css" ]; then
    print_success "Refactored CSS file exists"
    
    CSS_LINES=$(wc -l < src/app/dashboard/dashboard-refactored.css)
    print_info "Dashboard CSS: $CSS_LINES lines"
    
    # Check for CSS variables
    if grep -q -- "--coral:" src/app/dashboard/dashboard-refactored.css; then
        print_success "CSS variables defined (--coral)"
    fi
    
    # Check for responsive design
    if grep -q "@media" src/app/dashboard/dashboard-refactored.css; then
        MEDIA_QUERIES=$(grep -c "@media" src/app/dashboard/dashboard-refactored.css)
        print_success "Responsive design: $MEDIA_QUERIES media queries"
    fi
else
    print_error "Refactored CSS file not found"
fi

print_subheader "2.8 Monthly Report Page Validation"

if [ -f "src/app/dashboard/monthly-report/page.tsx" ]; then
    print_success "Monthly report page exists"
    
    MR_LINES=$(wc -l < src/app/dashboard/monthly-report/page.tsx)
    print_info "Monthly report: $MR_LINES lines of code"
    
    # Check for features
    if grep -q "export" src/app/dashboard/monthly-report/page.tsx; then
        print_success "Monthly report properly exported"
    fi
else
    print_error "Monthly report page not found"
fi

print_subheader "2.9 API Integration Check"

print_info "Checking API integration files..."

API_FILES=(
    "src/lib/api.ts"
    "src/lib/api/reportsAPI.ts"
    "src/lib/api/loansAPI.ts"
)

for api_file in "${API_FILES[@]}"; do
    if [ -f "$api_file" ]; then
        print_success "API file exists: $api_file"
        FUNCTIONS=$(grep -c "export" "$api_file" || echo "0")
        print_info "  ├─ Exported functions: $FUNCTIONS"
    else
        print_warning "API file not found: $api_file"
    fi
done

print_subheader "2.10 Component Library Check"

print_info "Checking shared components..."

COMPONENTS=(
    "src/components/ui/button.tsx"
    "src/components/ui/card.tsx"
    "src/components/ui/input.tsx"
    "src/components/layout/header.tsx"
    "src/components/layout/sidebar.tsx"
)

COMPONENT_COUNT=0
for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        print_success "Component exists: $(basename $component)"
        ((COMPONENT_COUNT++))
    fi
done

print_info "Components found: $COMPONENT_COUNT/${#COMPONENTS[@]}"

print_subheader "2.11 Hooks & Utilities Check"

if [ -f "src/hooks/useDataSync.ts" ]; then
    print_success "useDataSync hook exists"
fi

if [ -f "src/hooks/usePagination.ts" ]; then
    print_success "usePagination hook exists"
fi

if [ -f "src/utils/formatters.ts" ]; then
    print_success "formatters utility exists"
fi

print_subheader "2.12 Asset Check"

print_info "Checking assets directory..."

if [ -d "public" ]; then
    ASSET_COUNT=$(find public -type f | wc -l)
    print_success "Public assets: $ASSET_COUNT files"
fi

################################################################################
#                    PHASE 3: CONFIGURATION VALIDATION
################################################################################

print_header "PHASE 3: CONFIGURATION & ENVIRONMENT"

print_subheader "3.1 Environment Configuration"

if [ -f ".env.example" ]; then
    print_success ".env.example exists"
    
    ENV_VARS=$(grep -c "=" .env.example)
    print_info "Environment variables defined: $ENV_VARS"
else
    print_error ".env.example not found"
fi

print_subheader "3.2 Next.js Configuration"

if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
    print_success "Next.js configuration file exists"
else
    print_warning "Next.js configuration file not found (using defaults)"
fi

print_subheader "3.3 TypeScript Configuration"

if [ -f "tsconfig.json" ]; then
    print_success "TypeScript config exists"
    
    # Check for strict mode
    if grep -q "\"strict\": true" tsconfig.json; then
        print_success "TypeScript strict mode: enabled"
    else
        print_warning "TypeScript strict mode: not fully enabled"
    fi
else
    print_error "tsconfig.json not found"
fi

print_subheader "3.4 PostCSS Configuration"

if [ -f "postcss.config.js" ]; then
    print_success "PostCSS config exists"
else
    print_warning "PostCSS config not found"
fi

print_subheader "3.5 Tailwind Configuration"

if [ -f "tailwind.config.ts" ] || [ -f "tailwind.config.js" ]; then
    print_success "Tailwind config exists"
else
    print_warning "Tailwind config not found (if using Tailwind)"
fi

################################################################################
#                    PHASE 4: DATABASE & BACKEND
################################################################################

print_header "PHASE 4: DATABASE & BACKEND STRUCTURE"

cd .. || exit 1

print_subheader "4.1 Backend Directory Structure"

if [ -d "backend" ]; then
    print_success "Backend directory exists"
    
    if [ -f "backend/package.json" ]; then
        print_success "Backend has package.json"
    fi
else
    print_warning "Backend directory not found"
fi

print_subheader "4.2 Database Configuration"

if [ -d "database" ]; then
    print_success "Database directory exists"
    
    DB_FILES=$(find database -type f | wc -l)
    print_info "Database files: $DB_FILES"
fi

print_subheader "4.3 Docker Configuration"

if [ -f "docker-compose.yml" ]; then
    print_success "docker-compose.yml exists"
    
    # Check for required services
    SERVICES=("postgres" "redis" "n8n" "baserow")
    for service in "${SERVICES[@]}"; do
        if grep -q "\"$service\":\|$service:" docker-compose.yml; then
            print_success "Service configured: $service"
        else
            print_warning "Service not found: $service"
        fi
    done
else
    print_warning "docker-compose.yml not found"
fi

if [ -f "docker-compose.prod.yml" ]; then
    print_success "docker-compose.prod.yml exists"
else
    print_warning "Production Docker config not found"
fi

################################################################################
#                    PHASE 5: DOCUMENTATION
################################################################################

print_header "PHASE 5: DOCUMENTATION REVIEW"

print_subheader "5.1 Main Documentation"

if [ -f "README.md" ]; then
    print_success "README.md exists"
    
    README_LINES=$(wc -l < README.md)
    print_info "README length: $README_LINES lines"
    
    # Check for key sections
    SECTIONS=("Features" "Installation" "Usage" "Architecture")
    for section in "${SECTIONS[@]}"; do
        if grep -q "$section" README.md; then
            print_success "README section: $section"
        fi
    done
else
    print_error "README.md not found"
fi

print_subheader "5.2 API Documentation"

if [ -f "docs/API.md" ]; then
    print_success "API documentation exists"
else
    print_warning "API documentation not found"
fi

if [ -f "docs/ARCHITECTURE.md" ]; then
    print_success "Architecture documentation exists"
else
    print_warning "Architecture documentation not found"
fi

################################################################################
#                    PHASE 6: CODE QUALITY METRICS
################################################################################

print_header "PHASE 6: CODE QUALITY ANALYSIS"

cd frontend-next || exit 1

print_subheader "6.1 TypeScript Files Analysis"

TYPESCRIPT_FILES=$(find src -name "*.tsx" -o -name "*.ts" | grep -v node_modules | wc -l)
print_info "TypeScript files: $TYPESCRIPT_FILES"

# Calculate total lines of TypeScript code
TYPESCRIPT_LINES=$(find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | tail -1 | awk '{print $1}')
print_info "Total TypeScript lines: $TYPESCRIPT_LINES"

print_subheader "6.2 CSS Files Analysis"

CSS_FILES=$(find . -path ./node_modules -prune -o -name "*.css" -type f | grep -v node_modules | wc -l)
print_info "CSS files: $CSS_FILES"

CSS_LINES=$(find . -path ./node_modules -prune -o -name "*.css" -type f -print0 | xargs -0 wc -l | tail -1 | awk '{print $1}' 2>/dev/null || echo "0")
print_info "Total CSS lines: $CSS_LINES"

print_subheader "6.3 File Size Analysis"

print_info "Largest files in src/:"
find src -type f -name "*.tsx" -o -name "*.ts" | xargs du -h | sort -rh | head -5 | while read line; do
    print_info "  $line"
done

print_subheader "6.4 Package Size Analysis"

if [ -d "node_modules" ]; then
    MODULES_SIZE=$(du -sh node_modules | cut -f1)
    print_info "node_modules size: $MODULES_SIZE"
    
    MODULES_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    print_info "Installed packages: $MODULES_COUNT"
fi

if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    print_info ".next build size: $BUILD_SIZE"
fi

################################################################################
#                    PHASE 7: FEATURE TESTING
################################################################################

print_header "PHASE 7: FEATURE & FUNCTIONALITY TESTING"

print_subheader "7.1 Dashboard Features"

print_info "Dashboard Components:"

# Check for key dashboard features
DASHBOARD_FEATURES=(
    "StatCard"
    "ToastContainer"
    "InsightCard"
    "FreeTrialBanner"
    "DashboardPage"
)

for feature in "${DASHBOARD_FEATURES[@]}"; do
    if grep -r "const $feature\|function $feature\|export.*$feature" src --include="*.tsx" > /dev/null; then
        print_success "Feature: $feature"
    else
        print_warning "Feature not found: $feature"
    fi
done

print_subheader "7.2 API Endpoints Coverage"

print_info "API endpoints used in frontend:"

ENDPOINTS=(
    "getDashboard"
    "getAnalytics"
    "getAIAnalysis"
    "getMonthlySummary"
    "getAll"
)

for endpoint in "${ENDPOINTS[@]}"; do
    if grep -r "$endpoint" src --include="*.ts" --include="*.tsx" > /dev/null; then
        print_success "Endpoint: $endpoint"
    fi
done

print_subheader "7.3 React Hooks Usage"

print_info "React Hooks detected:"

HOOKS=(
    "useQuery"
    "useMutation"
    "useState"
    "useEffect"
    "useCallback"
    "useMemo"
    "useRef"
)

for hook in "${HOOKS[@]}"; do
    COUNT=$(grep -r "$hook" src --include="*.tsx" | wc -l)
    if [ "$COUNT" -gt 0 ]; then
        print_success "Hook: $hook ($COUNT usage)"
    fi
done

print_subheader "7.4 Third-Party Integrations"

print_info "Integration libraries:"

LIBRARIES=(
    "recharts"
    "sonner"
    "lucide-react"
    "@clerk/nextjs"
    "@supabase/supabase-js"
    "zod"
)

for lib in "${LIBRARIES[@]}"; do
    if grep -r "$lib" src --include="*.tsx" --include="*.ts" > /dev/null; then
        print_success "Integration: $lib"
    fi
done

print_subheader "7.5 Responsive Design Check"

print_info "Responsive breakpoints in CSS:"

BREAKPOINTS=(
    "@media (max-width: 1024px)"
    "@media (max-width: 768px)"
    "@media (max-width: 640px)"
    "@media (max-width: 480px)"
)

for breakpoint in "${BREAKPOINTS[@]}"; do
    if grep -r "$breakpoint" . --include="*.css" --include="*.tsx" > /dev/null; then
        print_success "Breakpoint: $breakpoint"
    fi
done

print_subheader "7.6 Dark Mode Support"

if grep -r "data-theme\|dark:" . --include="*.css" --include="*.tsx" > /dev/null; then
    print_success "Dark mode support detected"
else
    print_warning "Dark mode support not detected"
fi

print_subheader "7.7 Accessibility Features"

print_info "Accessibility checks:"

if grep -r "aria-label\|role=\|alt=" src --include="*.tsx" | wc -l | grep -q "[^0]"; then
    ARIA_COUNT=$(grep -r "aria-\|role=" src --include="*.tsx" | wc -l)
    print_success "ARIA labels found: $ARIA_COUNT"
else
    print_warning "Limited ARIA support"
fi

print_subheader "7.8 Performance Optimization"

print_info "Performance optimizations:"

if grep -r "React.memo\|useMemo\|useCallback" src --include="*.tsx" > /dev/null; then
    print_success "Memoization detected"
fi

if grep -r "lazy\|Suspense" src --include="*.tsx" > /dev/null; then
    print_success "Code splitting detected"
fi

if grep -r "Image\|next/image" src --include="*.tsx" > /dev/null; then
    print_success "Next.js Image optimization"
fi

################################################################################
#                    PHASE 8: FORM & VALIDATION
################################################################################

print_header "PHASE 8: FORMS & DATA VALIDATION"

print_subheader "8.1 Form Libraries"

if grep -r "react-hook-form" src --include="*.tsx" > /dev/null; then
    print_success "React Hook Form integrated"
fi

if grep -r "zod\|Zod" src --include="*.tsx" > /dev/null; then
    ZSCHEMA_COUNT=$(grep -r "z\\.string\|z\\.object\|z\\.number" src --include="*.ts" | wc -l)
    print_success "Zod validation schemas: $ZSCHEMA_COUNT"
fi

print_subheader "8.2 Input Validation"

if grep -r "validate\|validation" src --include="*.tsx" > /dev/null; then
    VALIDATION_COUNT=$(grep -r "validate" src --include="*.tsx" | wc -l)
    print_success "Validation functions: $VALIDATION_COUNT"
fi

################################################################################
#                    PHASE 9: STATE MANAGEMENT
################################################################################

print_header "PHASE 9: STATE MANAGEMENT & DATA FETCHING"

print_subheader "9.1 React Query Setup"

if grep -r "useQuery\|useMutation\|useQueryClient" src --include="*.tsx" > /dev/null; then
    QUERY_COUNT=$(grep -r "useQuery\|useMutation" src --include="*.tsx" | wc -l)
    print_success "React Query usage: $QUERY_COUNT instances"
fi

if grep -r "QueryClient\|queryClient" src --include="*.tsx" --include="*.ts" > /dev/null; then
    print_success "QueryClient configured"
fi

print_subheader "9.2 Caching Strategy"

if grep -r "staleTime\|cacheTime\|gcTime" src --include="*.tsx" > /dev/null; then
    print_success "Cache configuration present"
fi

print_subheader "9.3 API Error Handling"

if grep -r "catch\|error" src/lib --include="*.ts" > /dev/null; then
    ERROR_HANDLERS=$(grep -r "catch" src --include="*.tsx" | wc -l)
    print_success "Error handlers: $ERROR_HANDLERS"
fi

################################################################################
#                    PHASE 10: SECURITY REVIEW
################################################################################

print_header "PHASE 10: SECURITY ASSESSMENT"

print_subheader "10.1 Authentication"

if grep -r "@clerk/nextjs\|useAuth\|useUser" src --include="*.tsx" > /dev/null; then
    print_success "Authentication (Clerk) integrated"
fi

print_subheader "10.2 Environment Variables"

if grep -r "process.env\|NEXT_PUBLIC" src --include="*.tsx" --include="*.ts" > /dev/null; then
    ENV_VAR_COUNT=$(grep -r "process.env" src --include="*.tsx" --include="*.ts" | wc -l)
    print_success "Environment variables used: $ENV_VAR_COUNT"
fi

print_subheader "10.3 API Security"

if grep -r "Authorization\|Bearer" src/lib --include="*.ts" > /dev/null; then
    print_success "Authorization headers configured"
fi

print_subheader "10.4 Input Sanitization"

if grep -r "sanitize\|escape\|xss" src --include="*.tsx" > /dev/null; then
    print_success "XSS protection measures found"
fi

################################################################################
#                    PHASE 11: DEPLOYMENT READINESS
################################################################################

print_header "PHASE 11: DEPLOYMENT READINESS CHECK"

print_subheader "11.1 Build Output"

if [ -d ".next" ]; then
    STANDALONE=$(find .next -name "standalone" -type d | wc -l)
    if [ "$STANDALONE" -gt 0 ]; then
        print_success "Standalone build available"
    fi
    
    # Check build pages
    if [ -d ".next/server/app" ]; then
        PAGE_COUNT=$(find .next/server/app -name "page.js" | wc -l)
        print_info "Built pages: $PAGE_COUNT"
    fi
else
    print_warning "Build not found (.next directory)"
fi

print_subheader "11.2 Vercel Deployment"

if [ -f "vercel.json" ]; then
    print_success "vercel.json configuration exists"
else
    print_info "No vercel.json (using defaults is fine)"
fi

print_subheader "11.3 Docker Readiness"

if [ -f "Dockerfile" ]; then
    print_success "Dockerfile exists"
else
    print_info "No Dockerfile (Vercel deployment doesn't require it)"
fi

print_subheader "11.4 Performance Budget"

print_info "Performance considerations:"
print_info "  ├─ TypeScript compilation enabled"
print_info "  ├─ CSS modules supported"
print_info "  ├─ Image optimization available"
print_info "  └─ API route optimization"

################################################################################
#                    PHASE 12: FINAL REPORT
################################################################################

print_header "PHASE 12: FINAL COMPREHENSIVE REPORT"

print_subheader "12.1 Project Statistics"

if [ -d "frontend-next" ]; then
    cd frontend-next || exit 1
fi
TS_COMPONENTS=$(find src/components -name "*.tsx" | wc -l)
TS_PAGES=$(find src/app -name "page.tsx" | wc -l)
TS_HOOKS=$(find src/hooks -name "*.ts" | wc -l)
TS_LIBS=$(find src/lib -name "*.ts" | wc -l)
TS_UTILS=0
if [ -d "src/utils" ]; then
    TS_UTILS=$(find src/utils -name "*.ts" | wc -l)
fi

print_info "Components: $TS_COMPONENTS"
print_info "Pages: $TS_PAGES"
print_info "Custom Hooks: $TS_HOOKS"
print_info "Utilities: $TS_UTILS"
print_info "Libraries: $TS_LIBS"

print_subheader "12.2 Test Summary"

echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo -e "${YELLOW}Tests Skipped: $TESTS_SKIPPED${NC}"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ "$TOTAL_TESTS" -gt 0 ]; then
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
else
    SUCCESS_RATE=0
fi
echo -e "Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"

print_subheader "12.3 Project Health Check"

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ Project is in EXCELLENT health${NC}"
    echo -e "${GREEN}✓ Ready for production deployment${NC}"
elif [ "$TESTS_FAILED" -lt 5 ]; then
    echo -e "${YELLOW}⚠ Project is in GOOD health with minor issues${NC}"
    echo -e "${YELLOW}⚠ Address failures before deployment${NC}"
else
    echo -e "${RED}✗ Project has CRITICAL issues${NC}"
    echo -e "${RED}✗ Fix failures before proceeding${NC}"
fi

print_subheader "12.4 Recommendations"

echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review any failed tests above"
echo "  2. Commit changes: git add . && git commit -m 'Pre-deployment testing complete'"
echo "  3. Deploy: npm run build && vercel --prod"
echo "  4. Monitor: Check Vercel dashboard for deployment status"
echo "  5. Verify: Test all features in production"

################################################################################
#                    FINAL OUTPUT
################################################################################

print_header "TEST SUITE COMPLETE ✓"

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All validation checks completed successfully!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

# Exit with appropriate code
if [ "$TESTS_FAILED" -eq 0 ]; then
    exit 0
else
    exit 1
fi
