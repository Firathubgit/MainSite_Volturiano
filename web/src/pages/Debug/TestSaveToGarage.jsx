import React, { useState } from 'react';
import SaveToGarageButton from '../../features/garage/components/SaveToGarageButton';
import styles from './TestSaveToGarage.module.css';

/**
 * Test page for SaveToGarageButton component
 * Access at /debug/test-save
 * 
 * This allows testing the save functionality before the configurator is built
 */
export default function TestSaveToGarage() {
  const [savedItem, setSavedItem] = useState(null);
  const [error, setError] = useState(null);

  // Example configuration matching garage schema
  const exampleConfig = {
    schemaVersion: 1,
    vehicle: {
      model: "Tornado GT",
      trim: "Launch Edition",
      year: 2025,
      vin: null
    },
    options: {
      exterior: [
        { id: "paint_orange_fury", label: "Orange Fury", price: 1800 },
        { id: "wheels_carbon", label: "Carbon Fiber Wheels", price: 3500 }
      ],
      interior: [
        { id: "seat_carbon", label: "Carbon Bucket Seats", price: 4500 },
        { id: "interior_alcantara", label: "Alcantara Interior", price: 2800 }
      ],
      performance: [
        { id: "brakes_ceramic", label: "Carbon Ceramic Brakes", price: 6500 },
        { id: "suspension_track", label: "Track Suspension", price: 3200 }
      ]
    },
    pricing: {
      basePriceCents: 18000000, // €180,000
      optionsTotalCents: 2050000, // €20,500
      discountCents: 0,
      currency: "EUR"
    },
    media: {
      heroImage: null, // Can add URL if you have one
      gallery: []
    },
    history: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "test",
      notes: "Test configuration from debug page"
    },
    metadata: {
      goalTags: ["track", "daily"],
      locale: "en",
      isPrototype: false,
      relatedShowcaseId: null
    }
  };

  const handleSuccess = (item) => {
    console.log('✅ Save successful!', item);
    setSavedItem(item);
    setError(null);
  };

  const handleError = (err) => {
    console.error('❌ Save failed:', err);
    setError(err.message || 'Unknown error');
    setSavedItem(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1>Test Save to Garage</h1>
        <p className={styles.subtitle}>
          Test the SaveToGarageButton component before the configurator is built.
        </p>

        <div className={styles.testSection}>
          <h2>Example Configuration</h2>
          <div className={styles.configPreview}>
            <div className={styles.configRow}>
              <strong>Vehicle:</strong> {exampleConfig.vehicle.model} {exampleConfig.vehicle.trim}
            </div>
            <div className={styles.configRow}>
              <strong>Year:</strong> {exampleConfig.vehicle.year}
            </div>
            <div className={styles.configRow}>
              <strong>Base Price:</strong> €{(exampleConfig.pricing.basePriceCents / 100).toLocaleString()}
            </div>
            <div className={styles.configRow}>
              <strong>Options Total:</strong> €{(exampleConfig.pricing.optionsTotalCents / 100).toLocaleString()}
            </div>
            <div className={styles.configRow}>
              <strong>Total:</strong> €{((exampleConfig.pricing.basePriceCents + exampleConfig.pricing.optionsTotalCents) / 100).toLocaleString()}
            </div>
            <div className={styles.configRow}>
              <strong>Options:</strong>
              <ul className={styles.optionsList}>
                {exampleConfig.options.exterior.map(opt => (
                  <li key={opt.id}>Exterior: {opt.label} (€{opt.price})</li>
                ))}
                {exampleConfig.options.interior.map(opt => (
                  <li key={opt.id}>Interior: {opt.label} (€{opt.price})</li>
                ))}
                {exampleConfig.options.performance.map(opt => (
                  <li key={opt.id}>Performance: {opt.label} (€{opt.price})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.testSection}>
          <h2>Save Button</h2>
          <p>Click the button below to save this configuration to your garage:</p>
          
          <div className={styles.buttonContainer}>
            <SaveToGarageButton
              configuration={exampleConfig}
              initialState="wishlist"
              navigateToGarage={false}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>

          {savedItem && (
            <div className={styles.successMessage}>
              <h3>✅ Success!</h3>
              <p>Configuration saved to garage!</p>
              <details>
                <summary>View saved item details</summary>
                <pre>{JSON.stringify(savedItem, null, 2)}</pre>
              </details>
              <p>
                <a href="/account/garage">Go to Garage →</a>
              </p>
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <h3>❌ Error</h3>
              <p>{error}</p>
              <p>Check console for details.</p>
            </div>
          )}
        </div>

        <div className={styles.testSection}>
          <h2>How to Test</h2>
          <ol>
            <li>Make sure you're logged in (check account menu)</li>
            <li>Click "Save to Garage" button above</li>
            <li>Watch for success/error messages</li>
            <li>Go to <a href="/account/garage">My Garage</a> to see the saved item</li>
            <li>Check Supabase Dashboard → Table Editor → garage_items to see the data</li>
          </ol>
        </div>

        <div className={styles.testSection}>
          <h2>Modify Configuration</h2>
          <p>You can edit the <code>exampleConfig</code> object in this file to test different configurations:</p>
          <ul>
            <li>Change vehicle model, trim, year</li>
            <li>Add/remove options</li>
            <li>Change pricing</li>
            <li>Test validation by removing required fields</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

