# Design Specification: Central Analytics Dashboard

## Design Philosophy
Minimalist elegance meets functional sophistication. Inspired by Tesla's automotive interfaces and Apple's design principles, prioritizing clarity, intuitive interactions, and delightful micro-animations that serve a purpose.

## Core Design Principles

### 1. Visual Hierarchy
- **Content First**: Data is the hero, chrome is minimal
- **Progressive Disclosure**: Show essential information first, details on demand
- **Spatial Consistency**: Predictable layout patterns across all screens
- **Intentional White Space**: Let the interface breathe

### 2. Motion Design
- **Purposeful Animation**: Every transition has meaning
- **Performance Perception**: Use motion to mask loading states
- **Smooth Transitions**: 60fps animations with hardware acceleration
- **Subtle Feedback**: Micro-interactions confirm user actions

### 3. Dark Mode Excellence
- **True Black**: OLED-optimized backgrounds (#000000)
- **Depth Through Shadows**: Subtle elevation system
- **Controlled Contrast**: Avoid pure white text
- **Accent Colors**: Strategic use of vibrant colors for emphasis

## Color System

### Primary Palette
```
Background Levels:
- Base:        #000000 (True black)
- Surface:     #0A0A0A (Elevated surfaces)
- Card:        #111111 (Card backgrounds)
- Overlay:     #1A1A1A (Modal/dropdown backgrounds)

Text Hierarchy:
- Primary:     #FFFFFF (100% opacity)
- Secondary:   #FFFFFF (70% opacity)
- Tertiary:    #FFFFFF (50% opacity)
- Disabled:    #FFFFFF (30% opacity)

Accent Colors:
- Blue:        #0A84FF (Primary actions, links)
- Green:       #32D74B (Success, positive trends)
- Red:         #FF453A (Errors, negative trends)
- Yellow:      #FFD60A (Warnings, attention)
- Purple:      #BF5AF2 (Premium features)
- Cyan:        #64D2FF (Information, highlights)

Data Visualization:
- Series 1:    #0A84FF
- Series 2:    #32D74B
- Series 3:    #FFD60A
- Series 4:    #FF453A
- Series 5:    #BF5AF2
- Series 6:    #64D2FF
- Series 7:    #FF9F0A
- Series 8:    #5E5CE6
```

### Gradient System
```
Premium Gradient:   linear-gradient(135deg, #667EEA 0%, #764BA2 100%)
Success Gradient:   linear-gradient(135deg, #32D74B 0%, #0A84FF 100%)
Danger Gradient:    linear-gradient(135deg, #FF453A 0%, #FF9F0A 100%)
Mesh Gradient:      Complex mesh for hero sections (blues/purples)
```

## Typography

### Font Stack
```
Primary:    'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace:  'Geist Mono', 'SF Mono', Monaco, monospace
```

### Type Scale
```
Display:    72px / 1.1 / -0.02em / 800
H1:         48px / 1.2 / -0.02em / 700
H2:         36px / 1.3 / -0.01em / 600
H3:         28px / 1.4 / -0.01em / 600
H4:         24px / 1.4 / 0 / 500
H5:         20px / 1.5 / 0 / 500
H6:         18px / 1.5 / 0 / 500
Body Large: 16px / 1.6 / 0 / 400
Body:       14px / 1.6 / 0 / 400
Small:      12px / 1.5 / 0 / 400
Micro:      10px / 1.4 / 0.02em / 500
```

## Spacing System
```
Base unit: 4px

Scale:
- xs:  4px
- sm:  8px
- md:  16px
- lg:  24px
- xl:  32px
- 2xl: 48px
- 3xl: 64px
- 4xl: 96px
- 5xl: 128px
```

## Component Design

### Navigation
```
Top Bar:
- Height: 64px
- Background: rgba(0, 0, 0, 0.8) with backdrop-filter: blur(20px)
- Border bottom: 1px solid rgba(255, 255, 255, 0.1)
- Logo + Navigation items (left)
- Search (center)
- User menu + Notifications (right)
- Sticky positioning with smooth hide on scroll down

Sidebar (Desktop):
- Width: 240px collapsed, 280px expanded
- Background: #0A0A0A
- Hover expand animation (200ms ease-out)
- Icon + Label navigation items
- Bottom section for settings/profile
```

### Cards & Surfaces
```
Base Card:
- Background: #111111
- Border: 1px solid rgba(255, 255, 255, 0.05)
- Border radius: 16px
- Padding: 24px
- Hover: border-color transitions to rgba(255, 255, 255, 0.1)
- Shadow: 0 4px 6px rgba(0, 0, 0, 0.3)

Interactive Card:
- Hover transform: scale(1.02)
- Transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
- Active transform: scale(0.98)
```

### Data Visualization

#### Chart Container
```
- Background: #0A0A0A
- Border radius: 12px
- Padding: 20px
- Title section with controls (top)
- Chart area (center)
- Legend (bottom or right)
```

#### Chart Styles
```
Line Charts:
- Line width: 2px
- Smooth curves (monotone cubic interpolation)
- Animated drawing on load (1s duration)
- Hover: Show data point with tooltip
- Grid: rgba(255, 255, 255, 0.05)

Bar Charts:
- Corner radius: 4px top
- Hover: 10% brightness increase
- Animation: Grow from bottom (staggered)
- Gap between bars: 20%

Pie/Donut Charts:
- Donut hole: 65% of radius
- Hover: Slice expands 5%
- Labels: Outside with leader lines
- Animation: Rotate in from 0deg

Heatmaps:
- Cell border: 1px gap
- Color scale: Blue to Red gradient
- Hover: Show exact value tooltip
- Animation: Fade in sequentially
```

### Forms & Inputs

#### Text Input
```
- Height: 44px
- Background: #0A0A0A
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Border radius: 8px
- Padding: 0 16px
- Focus: Border color #0A84FF with glow
- Placeholder: rgba(255, 255, 255, 0.3)
- Error state: Border color #FF453A
```

#### Buttons
```
Primary:
- Background: #0A84FF
- Text: white
- Height: 44px
- Padding: 0 24px
- Border radius: 8px
- Hover: brightness(1.1)
- Active: scale(0.98)
- Disabled: opacity(0.5)

Secondary:
- Background: transparent
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Hover: background rgba(255, 255, 255, 0.05)

Ghost:
- Background: transparent
- Hover: background rgba(255, 255, 255, 0.05)
- No border
```

#### Toggles & Checkboxes
```
Toggle:
- Width: 48px, Height: 28px
- Background: #333333 (off), #0A84FF (on)
- Thumb: 24px diameter, 2px margin
- Animation: 200ms ease-out

Checkbox:
- Size: 20px
- Border radius: 4px
- Check animation: Draw path (200ms)
```

### Modals & Overlays
```
Modal:
- Background: #1A1A1A
- Border radius: 20px
- Max width: 600px
- Padding: 32px
- Backdrop: rgba(0, 0, 0, 0.8) with blur(10px)
- Entry animation: Fade + scale from 0.95
- Exit animation: Fade + scale to 0.95

Toast Notifications:
- Position: Top right, 20px margin
- Background: #1A1A1A
- Border left: 4px solid (color based on type)
- Slide in from right
- Auto-dismiss after 5s with progress bar
```

### Tables
```
- Header background: #0A0A0A
- Row hover: background rgba(255, 255, 255, 0.02)
- Alternating rows: Subtle shade difference
- Sticky header on scroll
- Sortable columns with arrow indicators
- Pagination at bottom
```

## Animation Specifications

### Timing Functions
```
- ease-out:      cubic-bezier(0.0, 0, 0.2, 1)
- ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1)
- spring:        cubic-bezier(0.68, -0.55, 0.265, 1.55)
- smooth:        cubic-bezier(0.4, 0, 0.2, 1)
```

### Standard Durations
```
- Instant:       100ms (hover states)
- Quick:         200ms (toggles, small transitions)
- Normal:        300ms (page transitions)
- Slow:          500ms (complex animations)
- Showcase:      1000ms (initial load animations)
```

### Loading States
```
Skeleton Screens:
- Shimmer effect using gradient animation
- Duration: 1.5s infinite
- Background: linear-gradient wave effect

Progress Indicators:
- Circular: 2px stroke, rotating
- Linear: Height 4px with animated fill
- Dots: 3 dots with staggered bounce
```

## Responsive Design

### Breakpoints
```
Mobile:     320px - 767px
Tablet:     768px - 1023px
Desktop:    1024px - 1439px
Wide:       1440px+
```

### Mobile Adaptations
- Bottom navigation bar (iOS style)
- Full-width cards with 16px margin
- Collapsible sections
- Swipe gestures for navigation
- Touch-friendly tap targets (min 44px)

### Tablet Adaptations
- 2-column grid layouts
- Collapsible sidebar
- Responsive charts with legend repositioning
- Touch + mouse support

## Accessibility

### Focus States
- Blue outline (2px) with 2px offset
- High contrast mode support
- Keyboard navigation for all interactions
- Skip links for main content

### ARIA Labels
- Descriptive labels for all interactive elements
- Live regions for dynamic content
- Proper heading hierarchy
- Screen reader optimized data tables

## Icon System
- Style: Outlined, 1.5px stroke
- Sizes: 16px, 20px, 24px, 32px
- Consistent metaphors across the app
- Custom icon set based on SF Symbols/Heroicons

## Micro-interactions

### Hover Effects
- Buttons: Brightness increase + subtle scale
- Cards: Border highlight + shadow elevation
- Links: Underline animation
- Icons: 360° rotation or bounce

### Click Feedback
- Ripple effect from click point
- Scale down briefly (0.98)
- Quick flash of accent color

### Data Updates
- Numbers: Count up animation
- Charts: Smooth transitions between states
- New data: Highlight flash animation
- Deletions: Fade + slide out

## Performance Considerations

### Optimization Strategies
- Lazy load below-the-fold content
- Virtual scrolling for long lists
- Debounced search inputs
- Optimistic UI updates
- Progressive image loading with blur-up

### Asset Guidelines
- SVG for all icons and logos
- WebP for images with PNG fallback
- Variable fonts for weight animations
- CSS-only animations where possible
- GPU-accelerated transforms

## PWA-Specific Design Considerations

### Installation Experience
- **Install Prompt**: Custom styled banner matching dark theme
- **Splash Screen**: Branded loading screen with logo animation
- **App Icon**: Multiple sizes for different devices (192px, 512px minimum)
- **Status Bar**: Transparent with content extending edge-to-edge
- **Orientation**: Support both portrait and landscape seamlessly

### Offline UI States
```
Offline Indicator:
- Position: Top banner or status bar
- Background: #FFD60A (warning yellow) with 10% opacity
- Text: "Offline - Using cached data"
- Icon: Cloud with slash
- Animation: Subtle pulse

Sync Status:
- Pending sync indicator with queue count
- Last synced timestamp
- Manual sync button
- Progress indication during sync
```

### PWA-Specific Components

#### Install Button
```
- Background: Gradient (#0A84FF to #5E5CE6)
- Text: "Install App"
- Icon: Download arrow
- Position: Header or floating action button
- Hide after installation
- Cookie/localStorage to track dismissal
```

#### Update Banner
```
- Background: #0A84FF with 10% opacity
- Text: "Update available - Tap to refresh"
- Auto-dismiss after 10 seconds
- Smooth slide-in animation
```

### Touch Optimizations
- **Swipe Gestures**: Navigate between dashboard views
- **Pull to Refresh**: Elastic overscroll with loading indicator
- **Long Press**: Context menus for quick actions
- **Pinch to Zoom**: Charts and visualizations
- **Touch Targets**: Minimum 44x44px for all interactive elements

### Platform Adaptations

#### iOS PWA (Safari)
- Respect safe areas and notch
- Status bar style: black-translucent
- Overscroll bounce behavior
- Home indicator auto-hide
- Viewport-fit=cover for edge-to-edge

#### Android PWA (Chrome)
- Material Design touch ripples
- System navigation bar theming
- Adaptive icon with background/foreground layers
- Shortcuts for quick actions from home screen

#### Desktop PWA
- Titlebar customization
- Window controls overlay
- Keyboard shortcuts displayed
- Hover states for all interactive elements
- Right-click context menus

### Service Worker UI Feedback
```
Caching Status:
- Subtle progress bar during initial cache
- "Ready for offline" toast when complete
- Cache size indicator in settings

Background Sync:
- Pending actions badge
- Sync status in header
- Failed sync error handling
```

### Performance UI Patterns
- **Skeleton Screens**: During data fetching
- **Optimistic Updates**: Immediate UI response
- **Virtual Scrolling**: For large data sets
- **Progressive Enhancement**: Core features work instantly
- **Lazy Loading**: Images and heavy components

## Mobile-Responsive Component Library Approach

### Core Philosophy
Build mobile-first, enhance for desktop. Every component should feel native on touch devices while scaling elegantly to larger screens.

### Component Architecture Principles

#### 1. Responsive by Default
```typescript
// Every component accepts responsive props
interface ResponsiveComponentProps {
  size?: 'sm' | 'md' | 'lg' | ResponsiveValue<'sm' | 'md' | 'lg'>
  padding?: SpacingToken | ResponsiveValue<SpacingToken>
  display?: Display | ResponsiveValue<Display>
}

// ResponsiveValue allows different values per breakpoint
type ResponsiveValue<T> = T | {
  base?: T    // 320px+
  sm?: T      // 640px+
  md?: T      // 768px+
  lg?: T      // 1024px+
  xl?: T      // 1280px+
}
```

#### 2. Touch-First Interactions
```typescript
// Components detect input method and adapt
const useInputMethod = () => {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    // Detect touch capability and primary input
    const hasTouch = 'ontouchstart' in window
    const hasMouse = matchMedia('(pointer: fine)').matches
    setIsTouch(hasTouch && !hasMouse)
  }, [])

  return { isTouch, hasHover: !isTouch }
}
```

#### 3. Fluid Typography & Spacing
```css
/* Clamp functions for fluid scaling */
--font-size-body: clamp(14px, 4vw, 16px);
--font-size-heading: clamp(24px, 6vw, 36px);
--spacing-unit: clamp(4px, 1vw, 8px);

/* Container queries for component-level responsiveness */
@container (min-width: 400px) {
  .component { /* tablet styles */ }
}
```

### Component Patterns

#### 1. Adaptive Layouts
```tsx
// Components that completely change structure based on viewport
<DataCard>
  {/* Mobile: Stacked layout */}
  <MobileLayout>
    <Title />
    <Metric />
    <Chart size="compact" />
    <Details collapsed />
  </MobileLayout>

  {/* Desktop: Grid layout */}
  <DesktopLayout>
    <Left>
      <Title />
      <Metric />
    </Left>
    <Right>
      <Chart size="full" />
      <Details expanded />
    </Right>
  </DesktopLayout>
</DataCard>
```

#### 2. Progressive Disclosure
```tsx
// Mobile shows summary, desktop shows everything
const TableComponent = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return <MobileCardList />  // Cards with key info
  }

  return <DesktopDataTable />  // Full table with all columns
}
```

#### 3. Touch Gesture Support
```tsx
// Swipeable components for mobile navigation
const SwipeablePanel = () => {
  const handlers = useSwipeable({
    onSwipedLeft: () => navigateNext(),
    onSwipedRight: () => navigatePrev(),
    trackMouse: false,  // Touch only
    delta: 50           // Minimum swipe distance
  })

  return <div {...handlers}>...</div>
}
```

### Responsive Component Examples

#### Button Component
```tsx
const Button = ({ size = 'md', fullWidth, ...props }) => {
  const { isTouch } = useInputMethod()

  // Larger tap targets on touch devices
  const minHeight = {
    sm: isTouch ? '44px' : '32px',
    md: isTouch ? '48px' : '40px',
    lg: isTouch ? '56px' : '48px'
  }

  return (
    <StyledButton
      $minHeight={minHeight[size]}
      $fullWidth={fullWidth || (isTouch && size === 'lg')}
      {...props}
    />
  )
}
```

#### Navigation Component
```tsx
const Navigation = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <MobileNav>
        <BottomTabBar />  {/* iOS-style bottom navigation */}
        <SwipeableDrawer /> {/* Side drawer for additional items */}
      </MobileNav>
    )
  }

  return (
    <DesktopNav>
      <TopBar />
      <Sidebar />
    </DesktopNav>
  )
}
```

#### Chart Component
```tsx
const ResponsiveChart = ({ data }) => {
  const containerRef = useRef()
  const dimensions = useResizeObserver(containerRef)

  return (
    <ChartContainer ref={containerRef}>
      <Chart
        data={data}
        width={dimensions.width}
        height={dimensions.width < 400 ? 200 : 400}
        showLegend={dimensions.width > 600}
        simplified={dimensions.width < 400}
      />
    </ChartContainer>
  )
}
```

### Mobile-Specific Enhancements

#### 1. Bottom Sheet Pattern
```tsx
// iOS-style bottom sheets for mobile actions
const MobileActionSheet = () => (
  <BottomSheet
    snapPoints={[0.25, 0.5, 0.9]}  // Multiple heights
    initialSnap={0.25}
    enableOverlay
    enableSwipe
  >
    <SheetContent />
  </BottomSheet>
)
```

#### 2. Floating Action Buttons
```tsx
// Material Design FAB for primary mobile actions
const MobileFAB = () => (
  <FAB
    position="bottom-right"
    offset={{ bottom: 80, right: 20 }}  // Above tab bar
    expandable  // Opens action menu
  />
)
```

#### 3. Pull-to-Refresh
```tsx
const RefreshableList = () => (
  <PullToRefresh
    onRefresh={fetchLatestData}
    threshold={60}
    resistance={2.5}
  >
    <DataList />
  </PullToRefresh>
)
```

### Testing Approach

#### 1. Device Testing Matrix
```yaml
Devices to Test:
  Mobile:
    - iPhone 17 Pro (primary)
    - iPhone SE (small screen)
    - Android flagship (Pixel/Samsung)
  Tablet:
    - iPad Pro 12.9"
    - iPad Mini
  Desktop:
    - 1920x1080 (standard)
    - 4K display
    - Ultrawide (21:9)
```

#### 2. Interaction Testing
```tsx
// Test both touch and mouse interactions
describe('Button Component', () => {
  it('should have larger tap target on touch devices', () => {
    mockTouchDevice()
    const { getByRole } = render(<Button />)
    expect(getByRole('button')).toHaveStyle({ minHeight: '44px' })
  })

  it('should show hover state on desktop', () => {
    mockDesktopDevice()
    const { getByRole } = render(<Button />)
    fireEvent.mouseEnter(getByRole('button'))
    expect(getByRole('button')).toHaveClass('hover')
  })
})
```

### Performance Optimizations

#### 1. Conditional Loading
```tsx
// Load heavy components only when needed
const ChartSection = dynamic(
  () => import('./HeavyChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false  // Client-only for interactivity
  }
)
```

#### 2. Responsive Images
```tsx
const ResponsiveImage = ({ src, alt }) => (
  <picture>
    <source
      media="(max-width: 768px)"
      srcSet={`${src}?w=400 1x, ${src}?w=800 2x`}
    />
    <source
      media="(min-width: 769px)"
      srcSet={`${src}?w=800 1x, ${src}?w=1600 2x`}
    />
    <img src={src} alt={alt} loading="lazy" />
  </picture>
)
```

#### 3. Virtual Scrolling for Mobile
```tsx
// Virtualize long lists on mobile to preserve memory
const MobileList = ({ items }) => {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <VirtualList
        height={window.innerHeight - 120}  // Minus header/nav
        itemCount={items.length}
        itemSize={80}
        overscan={3}  // Render 3 items outside viewport
      >
        {({ index, style }) => (
          <ListItem style={style} item={items[index]} />
        )}
      </VirtualList>
    )
  }

  return <RegularList items={items} />
}
```

## Component Library Structure
```
/components
  /primitives
    - Button
    - Input
    - Card
    - Modal
  /charts
    - LineChart
    - BarChart
    - PieChart
    - Heatmap
  /layout
    - Navigation
    - Sidebar
    - Grid
    - Container
  /feedback
    - Toast
    - Alert
    - Skeleton
    - Spinner
  /mobile
    - BottomSheet
    - SwipeableDrawer
    - PullToRefresh
    - FAB
    - BottomTabBar
  /responsive
    - ResponsiveImage
    - AdaptiveTable
    - FluidText
    - ContainerQuery
```

## Design Tokens
All design values should be tokenized for consistency:
```json
{
  "colors": { ... },
  "spacing": { ... },
  "typography": { ... },
  "shadows": { ... },
  "animation": { ... },
  "breakpoints": { ... }
}
```

This design system prioritizes elegance, performance, and user delight while maintaining the sophisticated aesthetic inspired by Tesla and Apple interfaces.