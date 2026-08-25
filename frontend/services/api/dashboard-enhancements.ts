import {
  SALES_DATA_NAV_ITEM,
  WEATHER_VALIDATION_NAV_ITEM,
  SALES_DATA_PAGE,
  WEATHER_VALIDATION_PAGE,
} from './dashboard-markup'

export function setCardModel(root: HTMLElement, id: string, name: string, note: string) {
  const canvas = root.querySelector(`#${id}`)
  const card = canvas?.closest('.chart-card')
  if (card && card instanceof HTMLElement) {
    card.dataset.model = `${name}: ${note}`
  }
}

export function enhanceDashboardContent(root: HTMLElement) {
  const navigation = root.querySelector('.nav')
  if (navigation) {
    if (!navigation.querySelector('#salesDataNavItem')) {
      navigation.insertAdjacentHTML('beforeend', SALES_DATA_NAV_ITEM)
    }
    if (!navigation.querySelector('#weatherValidationNavItem')) {
      navigation.insertAdjacentHTML('beforeend', WEATHER_VALIDATION_NAV_ITEM)
    }
  }

  const content = root.querySelector('.content')
  if (content) {
    if (!content.querySelector('#page-sales-data')) {
      content.insertAdjacentHTML('beforeend', SALES_DATA_PAGE)
    }
    if (!content.querySelector('#page-weather-validation')) {
      content.insertAdjacentHTML('beforeend', WEATHER_VALIDATION_PAGE)
    }
  }
}
