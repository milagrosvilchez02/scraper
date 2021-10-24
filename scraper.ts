import type { Page } from "puppeteer";
import IScraper from "../../interfaces/scraper";
import Product from "../../entities/product";
import screenPage from "../../utils/capture";
import {
  DESCRIPTION_PLACEMENT,
  IDescriptionSection,
} from "../../interfaces/outputProduct";
import parseHtmlTextContent from "../../providerHelpers/parseHtmlTextContent";

const HARCODED_IMAGES = {
  "435_Silver (Out of stock)": [
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/435/3851/SILVERCELESTIALCHARMS_LOW-RES_ProductImage__83858.1628086498.jpg",
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/435/3848/Kenya_GEORGETTE_SILVERCHARMS_LOW-RES__64492.1628084542.jpg",
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/435/3850/Lauren_GEORGETTE_SILVERCHARMS_LOW-RES_2__21923.1628084551.jpg",
  ],
  "435_Gold": [
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/435/3849/Kenya_GEORGETTE_GOLDCHARMS_LOW-RES__76875.1628084567.jpg",
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/435/3472/NECTAR_GEORGETTE_CHARMS_LOW-RES_02__59775.1612391349.jpg",
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/435/3469/VOILE_CHARMS_LOW-RES_01__96084.1612391356.jpg",
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/435/3470/VOILE_CHARMS_LOW-RES_02__85621.1612391359.jpg",
  ],
  "443_Powder Pink Trio (Out of stock)": [
    "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/443/3482/Tortoise-Shell-NAS-Glamour-Shot-Low-Res__93264.1613518076.jpg?c=2",
  ],
};

const HARDCODED_DIRECTIONS = {
  "335": {
    [DESCRIPTION_PLACEMENT.DISTANT]:
      "<p>To remove excess polish from skin and cuticles, dip brush in acetone and gently wipe away polish from the edge of the nail. Repeat as needed on each nail.</p>",
  },
};

const getTitle = async (page: Page) => {
  return await page.$eval(".productView-title", (elem) => elem.textContent);
};

const getVariants = async (page: Page) =>
  await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".form-select.form-select--small > option"),
      (option) => {
        if (option.getAttribute("value")) {
          return {
            variant: option.textContent,
            availability: !option.innerHTML.includes("Out of stock"),
            value: option.getAttribute("value"),
          };
        }
        // todo culpa de ts
        return null;
      }
    ).filter((content) => content != null)
  );

const getProductJson = async (page: Page) => {
  await page.waitForFunction("window.item");
  return page.evaluate(() => {
    // @ts-ignore
    return { product: window.item };
  });
};

const getAdditionalSections = async (
  page: Page
): Promise<IDescriptionSection[]> => {
  return await page.evaluate(
    (DESCRIPTION_PLACEMENT, HARDCODED_DIRECTIONS) => {
      const additionalSections: IDescriptionSection[] = [];

      let mainContentHTML = Array.from(
        document.querySelectorAll(
          ".productView-info div.productView-info-value .productView-info-value"
        )
      );

      if (mainContentHTML.length === 0) {
        mainContentHTML = Array.from(
          document.querySelectorAll(
            ".productView-info div.productView-info-value"
          )
        );
      }

      additionalSections.push({
        name: "ABOUT",
        content: mainContentHTML[0].outerHTML.trim(),
        description_placement: DESCRIPTION_PLACEMENT.MAIN,
      });

      if (mainContentHTML.length > 1) {
        additionalSections.push({
          name: "NOTES",
          content: mainContentHTML[1].outerHTML.trim(),
          description_placement: DESCRIPTION_PLACEMENT.ADJACENT,
        });
      }

      // Distant description pushed
      let distantDescription = document
        .querySelector("#tab-description > div > div:nth-child(2) > p")
        ?.outerHTML.trim();
      if (!distantDescription) {
        // @ts-ignore
        const hardcodedValue = HARDCODED_DIRECTIONS[window.item.ProductID];
        if (hardcodedValue) {
          distantDescription = hardcodedValue[DESCRIPTION_PLACEMENT.DISTANT];
        }
      }
      if (distantDescription) {
        additionalSections.push({
          name: "DIRECTIONS",
          content: distantDescription,
          description_placement: DESCRIPTION_PLACEMENT.DISTANT,
        });
      }

      return additionalSections;
    },
    DESCRIPTION_PLACEMENT,
    HARDCODED_DIRECTIONS
  );
};

const getProductData = async (page: Page) => {
  await page.waitForFunction("window.BCData");
  return page.evaluate(() => {
    // @ts-ignore
    return { product: window.BCData };
  });
};

const getVideos = async (page: Page) => {
  return await page.evaluate(async () => {
    const videos: string[] = [];

    document
      .querySelectorAll(
        "#tab-description > div > div:nth-child(1) > p > iframe"
      )
      .forEach((element) => {
        const videoUrl = element.getAttribute("src");
        if (videoUrl) {
          videos.push(videoUrl);
        }
      });

    return videos;
  });
};

const getImages = async (page: Page): Promise<string[]> => {
  return await page.evaluate(() => {
    const images = new Set<string>();
    const arrayImagesGiftBox = [
      "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/443/3478/blue-giftbox__94801.1613517964.jpg?c=2",
      "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/443/3481/tealgiftbox__83659.1613517956.jpg?c=2",
      "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/443/3482/Tortoise-Shell-NAS-Glamour-Shot-Low-Res__93264.1613518076.jpg?c=2",
      "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/443/3486/pinkgiftboxduo__37847.1613518442.jpg?c=2",
      "https://cdn11.bigcommerce.com/s-afc70/images/stencil/1280x1280/products/443/3487/Gift-Box__23266.1626355417.jpg?c=2",
    ];

    document
      .querySelectorAll(".productView-thumbnail-link")
      .forEach((element) => {
        const imageURL = element.getAttribute(
          "data-image-gallery-zoom-image-url"
        );

        for (let i = 0; i <= 4; i++) {
          arrayImagesGiftBox.forEach((url) => {
            if (url === imageURL) {
              images.add(url);
              arrayImagesGiftBox.splice(i, 1);
            }
          });
        }

        if (imageURL) {
          images.add(imageURL);
        }
      });

    return [...images];
  });
};

const getAllImages = async (page: Page): Promise<string[]> => {
  return await page.evaluate(() => {
    const images = new Set<string>();

    document
      .querySelectorAll(".productView-thumbnail-link")
      .forEach((element) => {
        const imageURL = element.getAttribute(
          "data-image-gallery-zoom-image-url"
        );
        if (imageURL) {
          images.add(imageURL);
        }
      });

    return [...images];
  });
};

const getBreadcrumbs = async (page: Page): Promise<string[]> => {
  return await page.evaluate(() => {
    const breadcrumbs: string[] = [];
    document
      .querySelectorAll(".breadcrumbs.breadcrumb-container li")
      .forEach((label) => {
        const text = label?.textContent?.trim();
        if (text) {
          breadcrumbs.push(text);
        }
      });
    return breadcrumbs;
  });
};

const getBullets = async (page: Page): Promise<string[]> => {
  return await page.evaluate(() => {
    const bullets: string[] = [];
    document
      .querySelectorAll(".product_details_column h5")
      .forEach((bullet) => {
        const notReadyText = bullet?.textContent;
        if (notReadyText?.includes("") && notReadyText.includes("✔")) {
          const text = notReadyText.replace("✔", "").trim();
          bullets.push(text);
        }
      });

    document
      .querySelectorAll(".product_details_column ul li")
      .forEach((additionalBullet) => {
        const text = additionalBullet?.textContent;
        if (text) bullets.push(text);
      });

    document.querySelectorAll(".product_details_column p").forEach((bullet) => {
      const ingredients =
        `Butyl Acetate, Ethyl Acetate, Nitrocellulose, Adipic Acid / Neopentyl Glycol / Trimellitic Anhydride Copolymer, 
        Acetyl Tributyl Citrate, Isopropyl Alcohol, Acrylates Copolymer,
        Stearalkonium Bentonite, N-Butyl Alcohol, Styrene / Acrylates Copolymer, 
        Benzophenone-1, Silica, Alumina, Trimethylpentanediyl Dibenzoate`.trim();
      const mayContain =
        `Aluminum Powder (CI 77000), Bismuth Oxychloride (CI 77163), Ferric Ferrocyanide (CI 77510), 
        Iron Oxides (CI 77489, CI 77491, CI 77492, CI 77499), Mica (CI 77019), Polyethylene Terephthalate, Red 6 (CI 15850), Red 7 (CI 15850), 
        Red 30 (CI 73360), Red 34 (CI 15880), Tin Oxide (CI 77861), 
        Titanium Dioxide (CI 77891), Ultramarines (CI 77007), Violet 2 (CI 60725), Yellow 5 (CI 19140), Yellow 10 (CI 47005)`.trim();

      const hasIngredients = bullet?.textContent;
      if (hasIngredients?.includes("Ingredients: View full list")) {
        bullets.push(ingredients);
        bullets.push(mayContain);
      }
      if (
        hasIngredients?.includes("Ingredients: ") &&
        !bullet.getAttribute("href")
      ) {
        bullets.push(hasIngredients);
      }
    });
    const kindlyNote = Array.from(
      document.getElementsByClassName("productView-info-name")
    ).find((elem) => elem.textContent?.includes("KINDLY NOTE"));
    if (kindlyNote && kindlyNote.textContent) {
      bullets.push(kindlyNote.textContent);
    }

    const packaging = document.querySelector(
      "body > div.body > div.container > div > div.productView.product-images-data.product-primary > section.productView-details.product-options > div.productView-options > dl > div:nth-child(6) > div:nth-child(1) > strong"
    );
    if (
      packaging &&
      packaging.textContent &&
      packaging.textContent.includes("NEW & IMPROVED PACKAGING")
    ) {
    }

    return bullets;
  });
};

const getSize = async (page: Page): Promise<string[]> => {
  return await page.evaluate(() => {
    const sizes: string[] = [];
    document
      .querySelectorAll(".product_details_column p")
      .forEach((paragraph) => {
        const isSize = paragraph.textContent;
        if (isSize?.includes("Size:")) {
          const text = isSize.replace("Size:", " ").trim();
          const textFinal = text.replace(" and", ",").trim();
          sizes.push(textFinal);
        }
      });
    return sizes;
  });
};

const scraper: IScraper = async (request, page) => {
  const products: Product[] = [];

  await page.goto(request.pageUrl);

  //getProductJson gets the global variable (Json) inside the window.item
  const providerData = await getProductJson(page);

  //getProductData a global variable inside window.BCData
  const productData = await getProductData(page);
  const bullets = await getBullets(page);
  const breadCrumbs = await getBreadcrumbs(page);
  const videos = await getVideos(page);
  const title = await getTitle(page);
  //const images = await getImages(page);
  const size = await getSize(page);
  const additionalSections = await getAdditionalSections(page);

  const getHigherPrice =
    (await page.$eval(".price.price--non-sale", (p) =>
      p.textContent?.trim().replace("$", "")
    )) || "";

  const generateProduct = (id = "", variant = "") => {
    const product = new Product(id, "title", "url");

    product.id = variant ? `${providerData.product.ProductID}_${variant}` : id;
    product.title = title || "";
    product.url = providerData.product.URL;
    product.realPrice = parseFloat(providerData.product.Price);
    product.higherPrice = parseFloat(getHigherPrice);
    product.availability = productData.product.product_attributes.purchasable;
    product.brand = "Cirque Colors";
    product.currency =
      productData.product.product_attributes.price.without_tax.currency;
    product.breadcrumbs = breadCrumbs;

    const descriptionHTML = additionalSections.find(
      (e) => e.description_placement === DESCRIPTION_PLACEMENT.MAIN
    );
    const description = parseHtmlTextContent(descriptionHTML?.content!);

    if (description) {
      product.description = description;
    }

    if (bullets.length === 0) {
      bullets.push(description);
    }

    product.bullets = bullets;
    product.videos = videos;
    product.size = size[0];

    product.additionalSections = additionalSections;
    return product;
  };

  try {
    const hasVariant = await page.$eval(
      ".form-label.form-label--alternate.form-label--inlineSmall",
      (e) => e
    );

    if (hasVariant != null) {
      try {
        // Genera productos con las variantes
        const variants = await getVariants(page);
        for (const variant of variants) {
          const product = generateProduct(undefined, `${variant?.variant}`);
          product.color = `${variant?.variant}`;

          if (variant?.availability) {
            await page.waitForSelector(".form-select.form-select--small");
            await page.select(
              `.form-select.form-select--small`,
              `${variant?.value}`
            );
            await page.waitForTimeout(500);

            const mainImage = await page.$eval(
              "body > div.body > div.container > div > div.productView.product-images-data.product-primary > section.productView-images > figure > div > div > div > a.slick-slide.slick-current.slick-active > img",
              (e: any) => e.src
            );

            product.images.push(mainImage);
          }

          const price = await page.$eval(
            "body > div.body > div.container > div > div.productView.product-images-data.product-primary > section.productView-details.product-options > div.productView-product > div.productView-price > div:nth-child(3) > span.price.price--withoutTax",
            (e) => e.textContent?.replace("$", "")
          );

          product.realPrice = parseFloat(price!);

          if (HARCODED_IMAGES[product.id]) {
            product.images.push(...HARCODED_IMAGES[product.id]);
          }

          products.push(product);
        }
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    const product = generateProduct(providerData.product.ProductID);
    product.images = await getAllImages(page);
    products.push(product);
  }
  const screenshot = await screenPage(page);

  return {
    screenshot,
    products,
  };
};

export default scraper;
